// Eén laag tussen de pagina's en de opslag. Zonder Supabase-instellingen (of met ?demo in de
// adresbalk) draait alles in de browser met voorbeeldgegevens, zodat de site te testen is.

import { CONFIG } from './config.js';
import { MAALTIJDDAGEN, KEUZE, dagenVanMaand, dagPlus, korteDatum, maandLabel, maandVan,
  schooljaarMaanden, vandaagBrussel, weekdag } from './kalender.js';

export const DEMO = !CONFIG.supabaseUrl || new URLSearchParams(location.search).has('demo');

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

let client = null;
function sb() {
  if (!client) {
    client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseSleutel, {
      auth: { storageKey: 'konijnenklas-leerkracht' },
    });
  }
  return client;
}

async function rpc(naam, parameters) {
  const { data, error } = await sb().rpc(naam, parameters);
  if (error) throw new Error(error.message);
  return data;
}

async function q(belofte) {
  const { data, error } = await belofte;
  if (error) throw new Error(error.message);
  return data;
}

const supabaseApi = {
  // Ouders
  klassen: () => rpc('ouder_klassen'),
  kinderen: (klasId) => rpc('ouder_kinderen', { p_klas: klasId }),
  gegevens: (kindId, achternaam) => rpc('ouder_gegevens', { p_kind: kindId, p_achternaam: achternaam }),
  maaltijdenVersturen: (kindId, achternaam, maanden, keuzes) => rpc('ouder_maaltijden_versturen', {
    p_kind: kindId, p_achternaam: achternaam, p_maanden: maanden.map((m) => `${m}-01`), p_keuzes: keuzes,
  }),
  opvangVersturen: (kindId, achternaam, van, tot, dagen) => rpc('ouder_opvang_versturen', {
    p_kind: kindId, p_achternaam: achternaam, p_van: van, p_tot: tot, p_dagen: dagen,
  }),

  // Leerkracht
  async sessie() {
    const { data } = await sb().auth.getSession();
    return !!data.session;
  },
  async aanmelden(wachtwoord) {
    const { error } = await sb().auth.signInWithPassword({ email: CONFIG.leerkrachtEmail, password: wachtwoord });
    if (error) throw new Error('Dit wachtwoord klopt niet.');
  },
  afmelden: () => sb().auth.signOut(),
  async wachtwoordWijzigen(wachtwoord) {
    const { error } = await sb().auth.updateUser({ password: wachtwoord });
    if (error) throw new Error(error.message);
  },
  leerkrachtKlassen: () => q(sb().from('klassen')
    .select('id, naam, leerjaar, school_id, scholen(naam)').order('naam'))
    .then((rijen) => rijen.map((r) => ({ ...r, school: r.scholen?.naam ?? '' }))),
  async klasBewaren(klas) {
    await q(sb().from('klassen').update({ naam: klas.naam, leerjaar: klas.leerjaar }).eq('id', klas.id));
    await q(sb().from('scholen').update({ naam: klas.school }).eq('id', klas.school_id));
  },
  async leerkrachtKinderen(klasId) {
    const kinderen = await q(sb().from('kinderen')
      .select('id, voornaam, achternaam').eq('klas_id', klasId).eq('actief', true));
    const ids = kinderen.map((k) => k.id);
    const laatste = ids.length ? await q(sb().from('inzendingen')
      .select('kind_id, tijdstip').in('kind_id', ids).order('tijdstip', { ascending: false }).limit(500)) : [];
    return kinderen.map((k) => ({ ...k, laatst: laatste.find((i) => i.kind_id === k.id)?.tijdstip ?? null }));
  },
  async kindBewaren(kind) {
    const rij = { voornaam: kind.voornaam, achternaam: kind.achternaam };
    if (kind.id) await q(sb().from('kinderen').update(rij).eq('id', kind.id));
    else await q(sb().from('kinderen').insert({ ...rij, klas_id: kind.klas_id }));
  },
  // Niet echt wissen: een kind van de lijst halen bewaart wat er al ingevuld was.
  kindVerwijderen: (id) => q(sb().from('kinderen').update({ actief: false }).eq('id', id)),
  async fiche(kindId, van, tot) {
    const [kind, maaltijden, opvang, inzendingen] = await Promise.all([
      q(sb().from('kinderen').select('id, voornaam, achternaam, klas_id').eq('id', kindId).single()),
      q(sb().from('maaltijden').select('datum, keuze').eq('kind_id', kindId).gte('datum', van).lte('datum', tot)),
      q(sb().from('opvang').select('datum').eq('kind_id', kindId).gte('datum', van).lte('datum', tot)),
      q(sb().from('inzendingen').select('soort, samenvatting, details, tijdstip').eq('kind_id', kindId)
        .order('tijdstip', { ascending: false }).limit(50)),
    ]);
    return {
      kind,
      maaltijden: Object.fromEntries(maaltijden.map((m) => [m.datum, m.keuze])),
      opvang: opvang.map((o) => o.datum),
      inzendingen,
    };
  },
  vrijeDagen: (schoolId, van, tot) => q(sb().from('vrije_dagen').select('id, school_id, datum, omschrijving')
    .or(`school_id.is.null,school_id.eq.${schoolId}`).gte('datum', van).lte('datum', tot).order('datum')),
  vrijeDagToevoegen: (schoolId, datum, omschrijving) =>
    q(sb().from('vrije_dagen').insert({ school_id: schoolId, datum, omschrijving })),
  vrijeDagVerwijderen: (id) => q(sb().from('vrije_dagen').delete().eq('id', id)),
  pushBewaren: (abonnement, toestel) => {
    const j = abonnement.toJSON();
    return q(sb().from('push_abonnementen').upsert({
      endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, toestel,
    }));
  },
  async testMelding() {
    const { data, error } = await sb().functions.invoke('melding', { body: { test: true } });
    if (error) throw new Error(error.message);
    return data.verstuurd;
  },
};

// ---------------------------------------------------------------------------
// Demo: dezelfde regels als de database, bewaard in deze browser
// ---------------------------------------------------------------------------

const DEMO_SLEUTEL = 'konijnenklas-demo';
const DEMO_VRIJ = [
  ['2026-11-02', '2026-11-06', 'Herfstvakantie'], ['2026-11-11', '2026-11-11', 'Wapenstilstand'],
  ['2026-12-21', '2027-01-01', 'Kerstvakantie'], ['2027-02-08', '2027-02-12', 'Krokusvakantie'],
  ['2027-03-29', '2027-04-09', 'Paasvakantie'], ['2027-05-06', '2027-05-06', 'Hemelvaart'],
  ['2027-05-07', '2027-05-07', 'Vrijdag na Hemelvaart'], ['2027-05-17', '2027-05-17', 'Pinkstermaandag'],
];

function demoLaden() {
  try {
    const s = JSON.parse(localStorage.getItem(DEMO_SLEUTEL));
    if (s) return s;
  } catch { /* leeg of geblokkeerd: opnieuw beginnen */ }
  const vrij = [];
  let id = 1;
  for (const [van, tot, omschrijving] of DEMO_VRIJ) {
    for (let d = van; d <= tot; d = dagPlus(d, 1)) {
      if (weekdag(d) <= 5) vrij.push({ id: id++, school_id: null, datum: d, omschrijving });
    }
  }
  return {
    school: { id: 's1', naam: 'De Triangel' },
    klas: { id: 'k1', school_id: 's1', naam: 'Konijnenklas', leerjaar: 'Peuters' },
    kinderen: [
      { id: 'c1', klas_id: 'k1', voornaam: 'Emma', achternaam: 'Peeters', actief: true },
      { id: 'c2', klas_id: 'k1', voornaam: 'Lars', achternaam: 'Janssens', actief: true },
      { id: 'c3', klas_id: 'k1', voornaam: 'Noor', achternaam: 'Van den Broeck', actief: true },
    ],
    vrij, volgendId: id, maaltijden: {}, opvang: {}, inzendingen: [],
  };
}
function demoBewaren(s) {
  try { localStorage.setItem(DEMO_SLEUTEL, JSON.stringify(s)); } catch { /* demo blijft dan in het geheugen */ }
}
let demoStaat = null;
const ds = () => (demoStaat ??= demoLaden());
const wacht = (waarde) => new Promise((r) => setTimeout(() => r(structuredClone(waarde)), 150));
const norm = (t) => (t ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

function demoControle(kindId, achternaam) {
  const kind = ds().kinderen.find((k) => k.id === kindId && k.actief);
  if (!kind || norm(kind.achternaam) !== norm(achternaam)) throw new Error('De achternaam klopt niet.');
  return kind;
}
const demoVrij = (d) => ds().vrij.find((v) => v.datum === d);
function demoMelding(kindId, soort, samenvatting, details) {
  ds().inzendingen.unshift({ kind_id: kindId, soort, samenvatting, details, tijdstip: new Date().toISOString() });
  demoBewaren(ds());
}

const demoApi = {
  klassen: () => wacht([{ id: ds().klas.id, naam: ds().klas.naam, leerjaar: ds().klas.leerjaar, school: ds().school.naam }]),
  kinderen: () => wacht(ds().kinderen.filter((k) => k.actief)
    .map(({ id, voornaam, achternaam }) => ({ id, voornaam, achternaam }))
    .sort((a, b) => a.voornaam.localeCompare(b.voornaam))),
  gegevens(kindId, achternaam) {
    demoControle(kindId, achternaam);
    const vandaag = vandaagBrussel();
    const maanden = schooljaarMaanden(vandaag);
    const binnen = (d) => maanden.includes(maandVan(d));
    const laatst = (soort) => ds().inzendingen.find((i) => i.kind_id === kindId && i.soort === soort)?.tijdstip ?? null;
    return wacht({
      vandaag,
      schooljaar_start: `${maanden[0]}-01`,
      maaltijden: Object.fromEntries(Object.entries(ds().maaltijden[kindId] ?? {}).filter(([d]) => binnen(d))),
      opvang: (ds().opvang[kindId] ?? []).filter(binnen).sort(),
      vrije_dagen: Object.fromEntries(ds().vrij.filter((v) => binnen(v.datum)).map((v) => [v.datum, v.omschrijving])),
      laatst_verstuurd: { maaltijden: laatst('maaltijden'), opvang: laatst('opvang') },
    });
  },
  maaltijdenVersturen(kindId, achternaam, maanden, keuzes) {
    demoControle(kindId, achternaam);
    const vandaag = vandaagBrussel();
    for (const m of maanden) {
      if (`${m}-01` <= vandaag) throw new Error(`${maandLabel(m)} is al begonnen en kan niet meer aangepast worden.`);
    }
    for (const [d, k] of Object.entries(keuzes)) {
      if (!maanden.includes(maandVan(d)) || !MAALTIJDDAGEN.includes(weekdag(d)) || demoVrij(d) || !KEUZE[k]) {
        throw new Error(`Op ${korteDatum(d)} kan je geen maaltijd kiezen.`);
      }
    }
    const huidig = (ds().maaltijden[kindId] ??= {});
    const gewijzigd = [];
    const details = {};
    for (const m of [...new Set(maanden)].sort()) {
      const oud = JSON.stringify(Object.entries(huidig).filter(([d]) => maandVan(d) === m).sort());
      const nieuw = Object.entries(keuzes).filter(([d]) => maandVan(d) === m).sort();
      if (oud === JSON.stringify(nieuw)) continue;
      for (const d of dagenVanMaand(m)) delete huidig[d];
      for (const [d, k] of nieuw) huidig[d] = k;
      gewijzigd.push(maandLabel(m));
      details[m] = Object.fromEntries(nieuw);
    }
    if (gewijzigd.length) demoMelding(kindId, 'maaltijden', `Maaltijden ${gewijzigd.join(', ')}`, details);
    return wacht({ gewijzigd: gewijzigd.length > 0 });
  },
  opvangVersturen(kindId, achternaam, van, tot, dagen) {
    demoControle(kindId, achternaam);
    const vanaf = [van, dagPlus(vandaagBrussel(), 1)].sort()[1];
    const binnen = (d) => d >= vanaf && d <= tot;
    for (const d of dagen.filter(binnen)) {
      if (weekdag(d) > 5 || demoVrij(d)) throw new Error(`Op ${korteDatum(d)} is er geen opvang.`);
    }
    const oud = new Set(ds().opvang[kindId] ?? []);
    const nieuw = new Set(dagen.filter(binnen));
    const erbij = [...nieuw].filter((d) => !oud.has(d)).sort();
    const eraf = [...oud].filter((d) => binnen(d) && !nieuw.has(d)).sort();
    if (!erbij.length && !eraf.length) return wacht({ gewijzigd: false });
    erbij.forEach((d) => oud.add(d));
    eraf.forEach((d) => oud.delete(d));
    ds().opvang[kindId] = [...oud].sort();
    const lijst = (l) => l.slice(0, 4).map(korteDatum).join(', ') + (l.length > 4 ? ` en nog ${l.length - 4}` : '');
    const delen = [];
    if (erbij.length) delen.push(`erbij: ${lijst(erbij)}`);
    if (eraf.length) delen.push(`eraf: ${lijst(eraf)}`);
    demoMelding(kindId, 'opvang', `Opvang ${delen.join('; ')}`, { erbij, eraf });
    return wacht({ gewijzigd: true });
  },

  sessie: () => wacht(sessionStorage.getItem('konijnenklas-demo-sessie') === '1'),
  aanmelden(wachtwoord) {
    if (wachtwoord !== 'konijn') throw new Error('Dit wachtwoord klopt niet. (Demo: konijn)');
    sessionStorage.setItem('konijnenklas-demo-sessie', '1');
    return wacht(null);
  },
  afmelden: () => { sessionStorage.removeItem('konijnenklas-demo-sessie'); return wacht(null); },
  wachtwoordWijzigen: () => wacht(null),
  leerkrachtKlassen: () => wacht([{ ...ds().klas, school: ds().school.naam }]),
  klasBewaren(klas) {
    Object.assign(ds().klas, { naam: klas.naam, leerjaar: klas.leerjaar });
    ds().school.naam = klas.school;
    demoBewaren(ds());
    return wacht(null);
  },
  leerkrachtKinderen: () => wacht(ds().kinderen.filter((k) => k.actief).map((k) => ({
    ...k, laatst: ds().inzendingen.find((i) => i.kind_id === k.id)?.tijdstip ?? null,
  }))),
  kindBewaren(kind) {
    if (kind.id) Object.assign(ds().kinderen.find((k) => k.id === kind.id), { voornaam: kind.voornaam, achternaam: kind.achternaam });
    else ds().kinderen.push({ ...kind, id: `c${Date.now()}`, actief: true });
    demoBewaren(ds());
    return wacht(null);
  },
  kindVerwijderen(id) {
    ds().kinderen.find((k) => k.id === id).actief = false;
    demoBewaren(ds());
    return wacht(null);
  },
  fiche(kindId, van, tot) {
    const binnen = (d) => d >= van && d <= tot;
    return wacht({
      kind: ds().kinderen.find((k) => k.id === kindId),
      maaltijden: Object.fromEntries(Object.entries(ds().maaltijden[kindId] ?? {}).filter(([d]) => binnen(d))),
      opvang: (ds().opvang[kindId] ?? []).filter(binnen),
      inzendingen: ds().inzendingen.filter((i) => i.kind_id === kindId).slice(0, 50),
    });
  },
  vrijeDagen: (schoolId, van, tot) => wacht(ds().vrij.filter((v) => v.datum >= van && v.datum <= tot)
    .sort((a, b) => a.datum.localeCompare(b.datum))),
  vrijeDagToevoegen(schoolId, datum, omschrijving) {
    if (ds().vrij.some((v) => v.datum === datum)) throw new Error('Die dag staat al in de lijst.');
    ds().vrij.push({ id: ds().volgendId++, school_id: schoolId, datum, omschrijving });
    demoBewaren(ds());
    return wacht(null);
  },
  vrijeDagVerwijderen(id) {
    ds().vrij = ds().vrij.filter((v) => v.id !== id);
    demoBewaren(ds());
    return wacht(null);
  },
  pushBewaren: () => wacht(null),
  testMelding: () => wacht(0),
};

export const api = DEMO ? demoApi : supabaseApi;
