// Ouderpagina: kind kiezen, achternaam controleren, maaltijden en opvang invullen en versturen.

import { api, DEMO } from './api.js';
import { themaKnop } from './thema.js';
import {
  DAGEN, KEUZES, KEUZE, MAALTIJDDAGEN, dagPlus, dagenVanMaand, el, keuzeBol, korteDatum, laatsteDagVoor,
  langeDatum, maaltijdInhoud, maanIcoon, maandKort, maandLabel, maandVan, schooljaarMaanden, tekenKalender,
  tijdstipLabel, vervang, weekdag,
} from './kalender.js';

const $ = (id) => document.getElementById(id);
const ONTHOUD = 'konijnenklas-ouder';
const hoofdletter = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const meervoud = (n, een, veel) => `${n} ${n === 1 ? een : veel}`;

const s = {
  klassen: [],
  kinderen: [],
  kind: null,
  achternaam: '',
  vandaag: '',
  maanden: [],
  vrij: {},
  bezig: false,
  m: { opgeslagen: {}, concept: {}, maand: '', modus: 'maand', selectie: new Set(), vast: {}, laatst: null },
  o: { opgeslagen: new Set(), concept: new Set(), maand: '', modus: 'maand', vast: new Set(), laatst: null },
};

// ---------------------------------------------------------------------------
// Regels (de database controleert dezelfde regels nog eens)
// ---------------------------------------------------------------------------

const maandOpen = (m) => `${m}-01` > s.vandaag;
const maaltijdMogelijk = (d) => MAALTIJDDAGEN.includes(weekdag(d)) && !s.vrij[d];
const opvangMogelijk = (d) => weekdag(d) <= 5 && !s.vrij[d];
const opvangOpen = (d) => opvangMogelijk(d) && d > s.vandaag;

const maandDeel = (keuzes, m) => JSON.stringify(Object.entries(keuzes).filter(([d]) => maandVan(d) === m).sort());
const gewijzigdeMaaltijdMaanden = () => s.maanden.filter(
  (m) => maandOpen(m) && maandDeel(s.m.concept, m) !== maandDeel(s.m.opgeslagen, m));
const gewijzigdeOpvangMaanden = () => s.maanden.filter((m) => dagenVanMaand(m).some(
  (d) => d > s.vandaag && s.o.concept.has(d) !== s.o.opgeslagen.has(d)));
const heeftWijzigingen = () => gewijzigdeMaaltijdMaanden().length > 0 || gewijzigdeOpvangMaanden().length > 0;

// ---------------------------------------------------------------------------
// Start: klas, kind en controle
// ---------------------------------------------------------------------------

function onthouden() {
  try { return JSON.parse(localStorage.getItem(ONTHOUD)) ?? {}; } catch { return {}; }
}
function onthoud(waarde) {
  try { localStorage.setItem(ONTHOUD, JSON.stringify(waarde)); } catch { /* niet erg */ }
}

async function start() {
  $('demoBand').hidden = !DEMO;
  const eerder = onthouden();
  try {
    s.klassen = await api.klassen();
  } catch {
    $('klas').replaceChildren(el('option', { value: '' }, 'Laden mislukt'));
    return toast('De gegevens konden niet geladen worden. Probeer het later opnieuw.');
  }
  $('klas').replaceChildren(
    el('option', { value: '' }, 'Kies je klas'),
    ...s.klassen.map((k) => el('option', { value: k.id }, k.leerjaar ? `${k.naam} (${k.leerjaar})` : k.naam)));
  const klas = s.klassen.find((k) => k.id === eerder.klas) ?? (s.klassen.length === 1 ? s.klassen[0] : null);
  if (klas) {
    $('klas').value = klas.id;
    await klasGekozen(eerder.kind);
  }
}

async function klasGekozen(kindVoorkeur) {
  const klas = s.klassen.find((k) => k.id === $('klas').value);
  const kindKeuze = $('kind');
  $('controle').hidden = true;
  kindKeuze.disabled = true;
  if (!klas) {
    kindKeuze.replaceChildren(el('option', { value: '' }, 'Kies eerst de klas'));
    return;
  }
  $('klasTitel').textContent = klas.naam;
  $('schoolTitel').textContent = klas.school;
  kindKeuze.replaceChildren(el('option', { value: '' }, 'Even geduld…'));
  try {
    s.kinderen = await api.kinderen(klas.id);
  } catch {
    kindKeuze.replaceChildren(el('option', { value: '' }, 'Laden mislukt'));
    return;
  }
  kindKeuze.replaceChildren(
    el('option', { value: '' }, 'Kies je kind'),
    ...s.kinderen.map((k) => el('option', { value: k.id }, `${k.voornaam} ${k.achternaam}`)));
  kindKeuze.disabled = false;
  if (s.kinderen.some((k) => k.id === kindVoorkeur)) {
    kindKeuze.value = kindVoorkeur;
    kindGekozen(false);
  }
}

function kindGekozen(focus = true) {
  const gekozen = !!$('kind').value;
  $('controle').hidden = !gekozen;
  $('achternaam').value = '';
  $('startFout').textContent = '';
  if (gekozen && focus) $('achternaam').focus();
}

async function controleren(e) {
  e.preventDefault();
  const kind = s.kinderen.find((k) => k.id === $('kind').value);
  const achternaam = $('achternaam').value;
  if (!kind) return;
  if (!achternaam.trim()) {
    $('startFout').textContent = 'Typ de achternaam van je kind.';
    return;
  }
  $('verder').disabled = true;
  try {
    const gegevens = await api.gegevens(kind.id, achternaam);
    s.kind = kind;
    s.achternaam = achternaam;
    onthoud({ klas: $('klas').value, kind: kind.id });
    laadGegevens(gegevens, { maaltijden: true, opvang: true });
    s.m.maand = s.maanden.find(maandOpen) ?? s.maanden.at(-1);
    s.o.maand = s.maanden.includes(maandVan(s.vandaag)) ? maandVan(s.vandaag) : s.maanden[0];
    $('kindNaam').textContent = `${kind.voornaam} ${kind.achternaam}`;
    $('start').hidden = true;
    $('werk').hidden = false;
    kiesTab('maaltijden');
    window.scrollTo(0, 0);
  } catch (fout) {
    $('startFout').textContent = fout.message.includes('achternaam')
      ? 'De achternaam klopt niet. Kijk de spelling na.'
      : 'Er ging iets mis. Probeer het opnieuw.';
  } finally {
    $('verder').disabled = false;
  }
}

function laadGegevens(g, delen) {
  s.vandaag = g.vandaag;
  s.maanden = schooljaarMaanden(g.vandaag);
  s.vrij = g.vrije_dagen ?? {};
  if (delen.maaltijden) {
    s.m.opgeslagen = { ...g.maaltijden };
    s.m.concept = { ...g.maaltijden };
    s.m.selectie.clear();
  }
  if (delen.opvang) {
    s.o.opgeslagen = new Set(g.opvang);
    s.o.concept = new Set(g.opvang);
  }
  s.m.laatst = g.laatst_verstuurd?.maaltijden ?? null;
  s.o.laatst = g.laatst_verstuurd?.opvang ?? null;
}

async function anderKind() {
  if (heeftWijzigingen() && !(await bevestig('Niet verstuurd', [
    el('p', {}, 'Je hebt wijzigingen die nog niet verstuurd zijn. Als je nu een ander kind kiest, gaan ze verloren.'),
  ], 'Toch wisselen'))) return;
  s.kind = null;
  $('werk').hidden = true;
  $('start').hidden = false;
  kindGekozen(true);
}

// Bij het wisselen van tabblad waarschuwen als het huidige tabblad nog niet verstuurd is.
// De wijzigingen blijven wel bewaard tot de ouder terugkomt.
async function wisselTab(tab) {
  const huidig = $('paneelMaaltijden').hidden ? 'opvang' : 'maaltijden';
  if (tab === huidig) return;
  const open = huidig === 'maaltijden' ? gewijzigdeMaaltijdMaanden() : gewijzigdeOpvangMaanden();
  if (open.length && !(await bevestig('Ben je zeker?', [
    el('p', {}, 'Je hebt nog niet verstuurd naar de leerkracht.'),
  ], 'Wisselen'))) return;
  kiesTab(tab);
}

function kiesTab(tab) {
  const maaltijden = tab === 'maaltijden';
  $('tabMaaltijden').setAttribute('aria-selected', String(maaltijden));
  $('tabOpvang').setAttribute('aria-selected', String(!maaltijden));
  $('paneelMaaltijden').hidden = !maaltijden;
  $('paneelOpvang').hidden = maaltijden;
  if (maaltijden) tekenMaaltijden(); else tekenOpvang();
}

// ---------------------------------------------------------------------------
// Gedeelde onderdelen van beide tabbladen
// ---------------------------------------------------------------------------

function maandKiezer(actief, status, kies) {
  const rij = el('div', { className: 'maanden', role: 'group', 'aria-label': 'Maand' },
    s.maanden.map((m) => {
      const st = status(m);
      const klassen = ['maand', m === actief && 'actief', st.vast && 'vast',
        st.gewijzigd ? 'gewijzigd' : st.ingevuld && 'ingevuld'].filter(Boolean).join(' ');
      return el('button', {
        type: 'button', className: klassen, onclick: () => kies(m),
        'aria-pressed': String(m === actief), 'aria-label': maandLabel(m),
      }, el('b', {}, maandKort(m)), el('small', {}, m.slice(0, 4)), el('span', { className: 'maand-stip' }));
    }));
  requestAnimationFrame(() => {
    const knop = rij.querySelector('.actief');
    if (knop) rij.scrollLeft = knop.offsetLeft - rij.clientWidth / 2 + knop.clientWidth / 2;
  });
  return rij;
}

function segment(opties, actief, kies) {
  return el('div', { className: 'segment', role: 'group', 'aria-label': 'Hoe wil je invullen?' },
    opties.map(([waarde, tekst]) => el('button', {
      type: 'button', 'aria-pressed': String(waarde === actief), onclick: () => kies(waarde),
    }, tekst)));
}

// Vakanties en vrije dagen van een maand, samengevoegd: "Herfstvakantie: ma 2 nov tot vr 6 nov".
function vrijeLijst(m) {
  const groepen = [];
  for (const d of dagenVanMaand(m).filter((d) => s.vrij[d])) {
    const laatste = groepen.at(-1);
    const vorigeSchooldag = laatste && dagPlus(laatste.tot, weekdag(laatste.tot) === 5 ? 3 : 1);
    if (laatste && laatste.naam === s.vrij[d] && vorigeSchooldag === d) laatste.tot = d;
    else groepen.push({ naam: s.vrij[d], van: d, tot: d });
  }
  if (!groepen.length) return null;
  return el('ul', { className: 'vrije-lijst' }, groepen.map((g) => el('li', {},
    `${g.naam}: ${g.van === g.tot ? korteDatum(g.van) : `${korteDatum(g.van)} tot ${korteDatum(g.tot)}`}`)));
}

function verstuurBalk(soort, gewijzigd, laatst, versturen) {
  const status = gewijzigd.length
    ? `Nog niet verstuurd: ${gewijzigd.map(maandLabel).join(', ')}`
    : laatst ? `Laatst verstuurd op ${tijdstipLabel(laatst)}` : 'Nog niets verstuurd';
  return el('div', { className: 'verstuur-balk' },
    el('p', { className: 'verstuur-status' + (gewijzigd.length ? ' open' : '') }, status),
    el('button', {
      type: 'button', className: 'knop hoofd breed', disabled: !gewijzigd.length || s.bezig, onclick: versturen,
    }, s.bezig ? 'Bezig met versturen…' : `Verstuur ${soort}`));
}

function maandKop(m, status, slot) {
  return el('div', { className: 'maand-kop' },
    el('h2', {}, maandLabel(m)),
    el('p', { className: 'status' + (slot ? ' slot' : '') }, status));
}

// ---------------------------------------------------------------------------
// Tabblad maaltijden
// ---------------------------------------------------------------------------

function vulMaaltijden(dagen, code) {
  for (const d of dagen) {
    if (code) s.m.concept[d] = code;
    else delete s.m.concept[d];
  }
}

function tekenMaaltijden() {
  const p = $('paneelMaaltijden');
  const m = s.m.maand;
  const open = maandOpen(m);
  const gewijzigd = gewijzigdeMaaltijdMaanden();
  const kalender = el('div');
  p.classList.toggle('vast', !open);
  vervang(p,
    maandKiezer(m, (maand) => ({
      vast: !maandOpen(maand),
      gewijzigd: gewijzigd.includes(maand),
      ingevuld: Object.keys(s.m.concept).some((d) => maandVan(d) === maand),
    }), (maand) => { s.m.maand = maand; s.m.selectie.clear(); tekenMaaltijden(); }),
    maandKop(m, open
      ? `Aanpassen kan tot en met ${langeDatum(laatsteDagVoor(m))}.`
      : m < maandVan(s.vandaag) ? 'Deze maand is voorbij.' : 'Deze maand is begonnen en ligt vast.', !open),
    open ? maaltijdOpties(m) : null,
    kalender,
    el('div', { className: 'legende' },
      el('span', {}, keuzeBol('warm'), 'Warm'),
      el('span', {}, keuzeBol('vegi'), 'Vegi'),
      el('span', {}, keuzeBol('boterhammen'), 'Boterhammen'),
      el('span', {}, el('span', { className: 'bol legende-maan' }, maanIcoon()), 'Dommelen'),
      el('span', {}, el('span', { className: 'bol uit' }), 'Geen maaltijd')),
    vrijeLijst(m),
    verstuurBalk('maaltijden', gewijzigd, s.m.laatst, versturenMaaltijden));

  tekenKalender(kalender, m, s.vandaag, (d) => {
    const inhoud = maaltijdInhoud(s.m.concept[d]);
    return {
      uit: !open || !maaltijdMogelijk(d),
      vrij: s.vrij[d] ?? null,
      klasse: inhoud?.klasse,
      letter: inhoud?.letter,
      dommelen: inhoud?.dommelen,
      gekozen: s.m.selectie.has(d),
      titel: inhoud?.label,
    };
  }, (d) => {
    s.m.modus = 'los';
    if (s.m.selectie.has(d)) s.m.selectie.delete(d); else s.m.selectie.add(d);
    tekenMaaltijden();
  });
}

function keuzeKnoppen(kies, uit = false) {
  return el('div', { className: 'keuzes' }, KEUZES.map((k) => el('button', {
    type: 'button', className: 'keuze', disabled: uit, onclick: () => kies(k.code),
  }, keuzeBol(k.code), k.label)));
}

function maaltijdOpties(m) {
  const dagen = dagenVanMaand(m).filter(maaltijdMogelijk);
  const naam = maandLabel(m).split(' ')[0];
  const inhoud = [segment([['maand', 'Hele maand'], ['vast', 'Vaste dagen'], ['los', 'Losse dagen']], s.m.modus,
    (modus) => { s.m.modus = modus; if (modus !== 'los') s.m.selectie.clear(); tekenMaaltijden(); })];

  if (s.m.modus === 'maand') {
    inhoud.push(
      el('p', { className: 'opties-uitleg' }, `Eén tik vult alle ${dagen.length} maaltijddagen van ${naam} in.`),
      keuzeKnoppen((code) => {
        vulMaaltijden(dagen, code);
        tekenMaaltijden();
        toast(`Hele maand: ${KEUZE[code].label.toLowerCase()}`);
      }),
      el('div', { className: 'opties-rij' }, el('button', {
        type: 'button', className: 'knop klein-knop', onclick: () => { vulMaaltijden(dagen, null); tekenMaaltijden(); },
      }, `${hoofdletter(naam)} leegmaken`)));
  } else if (s.m.modus === 'vast') {
    inhoud.push(
      el('p', { className: 'opties-uitleg' }, 'Kies per weekdag wat je kind eet, voor de hele maand.'),
      el('div', { className: 'vaste-dagen' }, MAALTIJDDAGEN.map((wd) => el('label', { className: 'vaste-dag' },
        el('span', {}, hoofdletter(DAGEN[wd - 1])),
        el('select', { onchange: (e) => { s.m.vast[wd] = e.target.value; } },
          el('option', { value: '', selected: !s.m.vast[wd] }, 'Niet wijzigen'),
          KEUZES.map((k) => el('option', { value: k.code, selected: s.m.vast[wd] === k.code }, k.label)),
          el('option', { value: 'leeg', selected: s.m.vast[wd] === 'leeg' }, 'Leegmaken'))))),
      el('button', {
        type: 'button', className: 'knop hoofd breed', onclick: () => {
          const gekozen = Object.entries(s.m.vast).filter(([, code]) => code);
          if (!gekozen.length) return toast('Kies eerst bij minstens één weekdag een maaltijd.');
          for (const [wd, code] of gekozen) {
            vulMaaltijden(dagen.filter((d) => weekdag(d) === Number(wd)), code === 'leeg' ? null : code);
          }
          tekenMaaltijden();
          toast(`Toegepast op ${naam}`);
        },
      }, `Toepassen op ${naam}`));
  } else {
    const n = s.m.selectie.size;
    inhoud.push(
      el('p', { className: 'opties-uitleg' }, n
        ? `${meervoud(n, 'dag', 'dagen')} gekozen. Kies nu de maaltijd.`
        : 'Tik op een of meer dagen in de kalender en kies dan de maaltijd.'),
      keuzeKnoppen((code) => {
        vulMaaltijden(s.m.selectie, code);
        s.m.selectie.clear();
        tekenMaaltijden();
      }, !n),
      el('div', { className: 'opties-rij' },
        el('button', {
          type: 'button', className: 'knop klein-knop', disabled: !n,
          onclick: () => { vulMaaltijden(s.m.selectie, null); s.m.selectie.clear(); tekenMaaltijden(); },
        }, 'Leegmaken'),
        el('button', {
          type: 'button', className: 'knop klein-knop', disabled: !n,
          onclick: () => { s.m.selectie.clear(); tekenMaaltijden(); },
        }, 'Selectie wissen')));
  }
  return el('div', { className: 'opties' }, inhoud);
}

async function versturenMaaltijden() {
  const maanden = gewijzigdeMaaltijdMaanden();
  if (!maanden.length) return;
  const naam = `${s.kind.voornaam} ${s.kind.achternaam}`;
  const ok = await bevestig('Maaltijden versturen?', [
    el('p', {}, 'Je verstuurt de maaltijden van ', el('b', {}, naam), ' voor:'),
    el('ul', {}, maanden.map((m) => {
      const n = Object.keys(s.m.concept).filter((d) => maandVan(d) === m).length;
      return el('li', {}, el('b', {}, hoofdletter(maandLabel(m))), n ? `: ${meervoud(n, 'dag', 'dagen')}` : ': leeggemaakt');
    })),
    el('p', {}, `Vanaf de eerste dag van een maand kan je die maand niet meer aanpassen. ${hoofdletter(maandLabel(maanden[0]))} ligt vast vanaf ${langeDatum(`${maanden[0]}-01`)}.`),
  ]);
  if (!ok) return;
  const keuzes = Object.fromEntries(Object.entries(s.m.concept).filter(([d]) => maanden.includes(maandVan(d))));
  await verstuur(() => api.maaltijdenVersturen(s.kind.id, s.achternaam, maanden, keuzes), { maaltijden: true });
}

// ---------------------------------------------------------------------------
// Tabblad opvang
// ---------------------------------------------------------------------------

function zetOpvang(dagen, aan) {
  for (const d of dagen) {
    if (aan) s.o.concept.add(d); else s.o.concept.delete(d);
  }
}

function tekenOpvang() {
  const p = $('paneelOpvang');
  const m = s.o.maand;
  const openDagen = dagenVanMaand(m).filter(opvangOpen);
  const gewijzigd = gewijzigdeOpvangMaanden();
  const kalender = el('div');
  p.classList.toggle('vast', !openDagen.length);
  vervang(p,
    maandKiezer(m, (maand) => ({
      vast: !dagenVanMaand(maand).some(opvangOpen),
      gewijzigd: gewijzigd.includes(maand),
      ingevuld: [...s.o.concept].some((d) => maandVan(d) === maand),
    }), (maand) => { s.o.maand = maand; tekenOpvang(); }),
    maandKop(m, openDagen.length
      ? 'Je kan elke dag aanpassen tot en met de dag voordien.'
      : m < maandVan(s.vandaag) ? 'Deze maand is voorbij.' : 'Deze maand kan je niet meer aanpassen.', !openDagen.length),
    openDagen.length ? opvangOpties(m, openDagen) : null,
    kalender,
    el('div', { className: 'legende' },
      el('span', {}, el('span', { className: 'bol o-aan' }), 'Opvang'),
      el('span', {}, el('span', { className: 'bol uit' }), 'Geen opvang mogelijk'),
      el('span', {}, 'Woensdag: tot 14u')),
    vrijeLijst(m),
    verstuurBalk('opvang', gewijzigd, s.o.laatst, versturenOpvang));

  tekenKalender(kalender, m, s.vandaag, (d) => {
    const aan = s.o.concept.has(d);
    return {
      uit: !opvangOpen(d),
      vrij: s.vrij[d] ?? null,
      klasse: aan ? 'o-aan' : null,
      letter: aan ? (weekdag(d) === 3 ? 'tot 14u' : 'opvang') : null,
      titel: aan ? (weekdag(d) === 3 ? 'opvang tot 14u' : 'opvang') : null,
    };
  }, (d) => {
    zetOpvang([d], !s.o.concept.has(d));
    tekenOpvang();
  });
}

function opvangOpties(m, openDagen) {
  const naam = maandLabel(m).split(' ')[0];
  const inhoud = [segment([['maand', 'Hele maand'], ['week', 'Per week'], ['vast', 'Vaste dagen']], s.o.modus,
    (modus) => { s.o.modus = modus; tekenOpvang(); })];

  if (s.o.modus === 'maand') {
    inhoud.push(
      el('p', { className: 'opties-uitleg' }, `Voor alle ${openDagen.length} dagen van ${naam} die nog kunnen. Je kan daarna nog losse dagen aan- of uittikken.`),
      el('div', { className: 'opties-rij' },
        el('button', { type: 'button', className: 'knop hoofd', onclick: () => { zetOpvang(openDagen, true); tekenOpvang(); } },
          'Elke dag opvang'),
        el('button', { type: 'button', className: 'knop', onclick: () => { zetOpvang(openDagen, false); tekenOpvang(); } },
          'Geen opvang')));
  } else if (s.o.modus === 'week') {
    const weken = new Map();
    for (const d of openDagen) {
      const maandag = dagPlus(d, 1 - weekdag(d));
      if (!weken.has(maandag)) weken.set(maandag, []);
      weken.get(maandag).push(d);
    }
    inhoud.push(
      el('p', { className: 'opties-uitleg' }, 'Tik op een week om alle dagen van die week aan of uit te zetten.'),
      el('div', { className: 'weken' }, [...weken].map(([maandag, dagen]) => {
        const aan = dagen.filter((d) => s.o.concept.has(d)).length;
        const [eerste, laatste] = [dagen[0], dagen.at(-1)];
        const label = maandVan(eerste) === maandVan(laatste)
          ? `${Number(eerste.slice(8))} tot ${korteDatum(laatste).slice(3)}`
          : `${korteDatum(eerste).slice(3)} tot ${korteDatum(laatste).slice(3)}`;
        return el('button', {
          type: 'button', className: 'week' + (aan === dagen.length ? ' aan' : ''),
          'aria-pressed': String(aan === dagen.length),
          onclick: () => { zetOpvang(dagen, aan !== dagen.length); tekenOpvang(); },
        }, `Week van ${label}`, el('small', {}, `${aan}/${dagen.length} dagen`));
      })));
  } else {
    inhoud.push(
      el('p', { className: 'opties-uitleg' }, `Kies de weekdagen en zet ze aan of uit voor heel ${naam}.`),
      el('div', { className: 'weekdagen' }, [1, 2, 3, 4, 5].map((wd) => el('label', { className: 'vinkje' },
        el('input', {
          type: 'checkbox', checked: s.o.vast.has(wd),
          onchange: (e) => { if (e.target.checked) s.o.vast.add(wd); else s.o.vast.delete(wd); },
        }),
        wd === 3 ? 'Woensdag tot 14u' : hoofdletter(DAGEN[wd - 1])))),
      el('div', { className: 'opties-rij' }, [true, false].map((aan) => el('button', {
        type: 'button', className: aan ? 'knop hoofd' : 'knop', onclick: () => {
          if (!s.o.vast.size) return toast('Vink eerst minstens één weekdag aan.');
          zetOpvang(openDagen.filter((d) => s.o.vast.has(weekdag(d))), aan);
          tekenOpvang();
        },
      }, aan ? 'Aanzetten' : 'Uitzetten'))));
  }
  return el('div', { className: 'opties' }, inhoud);
}

async function versturenOpvang() {
  const maanden = gewijzigdeOpvangMaanden();
  if (!maanden.length) return;
  const naam = `${s.kind.voornaam} ${s.kind.achternaam}`;
  const ok = await bevestig('Opvang versturen?', [
    el('p', {}, 'Je verstuurt de opvang van ', el('b', {}, naam), ' voor:'),
    el('ul', {}, maanden.map((m) => {
      const n = dagenVanMaand(m).filter((d) => d > s.vandaag && s.o.concept.has(d)).length;
      return el('li', {}, el('b', {}, hoofdletter(maandLabel(m))), n ? `: ${meervoud(n, 'dag', 'dagen')} opvang` : ': geen opvang');
    })),
    el('p', {}, 'Je kan elke dag nog aanpassen tot en met de dag voordien.'),
  ]);
  if (!ok) return;
  const van = `${s.maanden[0]}-01`;
  const tot = dagenVanMaand(s.maanden.at(-1)).at(-1);
  await verstuur(() => api.opvangVersturen(s.kind.id, s.achternaam, van, tot, [...s.o.concept].sort()), { opvang: true });
}

// ---------------------------------------------------------------------------
// Versturen, dialoog en toast
// ---------------------------------------------------------------------------

async function verstuur(actie, delen) {
  s.bezig = true;
  tekenActief();
  try {
    await actie();
    laadGegevens(await api.gegevens(s.kind.id, s.achternaam), delen);
    toast('Verstuurd. Dank je wel!');
  } catch (fout) {
    toast(fout.message || 'Versturen mislukt. Probeer het opnieuw.');
  } finally {
    s.bezig = false;
    tekenActief();
  }
}

function tekenActief() {
  if ($('paneelMaaltijden').hidden) tekenOpvang(); else tekenMaaltijden();
}

function bevestig(titel, inhoud, jaTekst = 'Versturen') {
  const dialoog = $('bevestig');
  $('bevestigTitel').textContent = titel;
  $('bevestigTekst').replaceChildren(...inhoud);
  dialoog.querySelector('button[value=ja]').textContent = jaTekst;
  dialoog.returnValue = '';
  dialoog.showModal();
  return new Promise((klaar) => {
    dialoog.addEventListener('close', () => klaar(dialoog.returnValue === 'ja'), { once: true });
  });
}

let toastTimer;
function toast(tekst) {
  const t = $('toast');
  t.textContent = tekst;
  t.classList.add('zichtbaar');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('zichtbaar'), 3200);
}

$('klas').addEventListener('change', () => klasGekozen());
$('kind').addEventListener('change', () => kindGekozen());
$('controle').addEventListener('submit', controleren);
$('anderKind').addEventListener('click', anderKind);
$('tabMaaltijden').addEventListener('click', () => wisselTab('maaltijden'));
$('tabOpvang').addEventListener('click', () => wisselTab('opvang'));
window.addEventListener('beforeunload', (e) => {
  if (s.kind && heeftWijzigingen()) e.preventDefault();
});

themaKnop($('themaKnop'));
start();
