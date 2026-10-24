// Leerkrachtensite: kinderen en hun fiche, klasgegevens, vrije dagen en pushmeldingen.
// Schermen via het adres: #kinderen, #kind=<id>, #klas, #vrij, #meldingen.

import { api, DEMO } from './api.js';
import { themaKnop } from './thema.js';
import { CONFIG } from './config.js';
import {
  MAALTIJDDAGEN, dagenVanMaand, el, keuzeBol, korteDatum, langeDatum, maaltijdInhoud, maanIcoon,
  maandKort, maandLabel, maandVan, schooljaarMaanden, tekenKalender, tijdstipLabel, vandaagBrussel, weekdag,
} from './kalender.js';

const $ = (id) => document.getElementById(id);
const vandaag = vandaagBrussel();
const maanden = schooljaarMaanden(vandaag);
const VAN = `${maanden[0]}-01`;
const TOT = dagenVanMaand(maanden.at(-1)).at(-1);

const s = { klas: null, vrij: {}, vrijLijst: [], ficheKind: null, ficheMaand: null };

// ---------------------------------------------------------------------------
// Aanmelden
// ---------------------------------------------------------------------------

async function start() {
  $('demoBand').hidden = !DEMO;
  if ('serviceWorker' in navigator && !DEMO) navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker?.addEventListener('message', (e) => {
    if (e.data?.openen) location.href = e.data.openen;
  });
  if (await api.sessie()) await openApp();
  else toonAanmelden();
}

function toonAanmelden() {
  $('app').hidden = true;
  $('afmelden').hidden = true;
  $('aanmelden').hidden = false;
}

async function aanmelden(e) {
  e.preventDefault();
  $('aanmeldFout').textContent = '';
  try {
    await api.aanmelden($('wachtwoord').value);
    $('wachtwoord').value = '';
    await openApp();
  } catch (fout) {
    $('aanmeldFout').textContent = fout.message;
  }
}

async function openApp() {
  $('aanmelden').hidden = true;
  $('app').hidden = false;
  $('afmelden').hidden = false;
  const klassen = await api.leerkrachtKlassen();
  s.klas = klassen[0];
  $('klasTitel').textContent = s.klas?.naam ?? 'Konijnenklas';
  await laadVrijeDagen();
  toonScherm();
}

async function laadVrijeDagen() {
  s.vrijLijst = s.klas ? await api.vrijeDagen(s.klas.school_id, VAN, TOT) : [];
  s.vrij = Object.fromEntries(s.vrijLijst.map((v) => [v.datum, v.omschrijving]));
}

// ---------------------------------------------------------------------------
// Schermen
// ---------------------------------------------------------------------------

function toonScherm() {
  const hash = location.hash.slice(1);
  const scherm = hash.startsWith('kind=') ? 'fiche' : (['klas', 'vrij', 'meldingen'].includes(hash) ? hash : 'kinderen');
  document.querySelectorAll('.nav .tab').forEach((t) => {
    t.setAttribute('aria-selected', String(t.dataset.scherm === (scherm === 'fiche' ? 'kinderen' : scherm)));
  });
  const houder = $('scherm');
  houder.replaceChildren(el('p', { className: 'laden' }, 'Even geduld…'));
  const teken = { kinderen: schermKinderen, fiche: (h) => schermFiche(h, hash.slice(5)), klas: schermKlas,
    vrij: schermVrij, meldingen: schermMeldingen }[scherm];
  teken(houder).catch((fout) => houder.replaceChildren(
    el('div', { className: 'kaart' }, el('p', { className: 'fout' }, fout.message || 'Er ging iets mis.'))));
}

async function schermKinderen(houder) {
  const kinderen = (await api.leerkrachtKinderen(s.klas.id))
    .sort((a, b) => a.voornaam.localeCompare(b.voornaam) || a.achternaam.localeCompare(b.achternaam));
  const lijst = el('ul', { className: 'lijst' });
  const zoek = el('input', { type: 'text', className: 'zoek', placeholder: 'Zoek een kind', 'aria-label': 'Zoek een kind' });
  const vul = () => {
    const term = zoek.value.trim().toLowerCase();
    lijst.replaceChildren(...kinderen
      .filter((k) => `${k.voornaam} ${k.achternaam}`.toLowerCase().includes(term))
      .map((k) => el('li', {}, el('button', {
        type: 'button', className: 'rij', onclick: () => { location.hash = `kind=${k.id}`; },
      }, el('span', {}, el('b', {}, `${k.voornaam} ${k.achternaam}`),
        el('small', {}, k.laatst ? `Laatst ingevuld ${tijdstipLabel(k.laatst)}` : 'Nog niets ingevuld')),
      el('span', { className: 'rij-pijl', 'aria-hidden': 'true' }, '›')))));
    if (!lijst.children.length) lijst.append(el('li', { className: 'klein' }, kinderen.length ? 'Geen kind gevonden.' : 'Nog geen kinderen.'));
  };
  zoek.addEventListener('input', vul);
  vul();

  const voornaam = el('input', { type: 'text', id: 'nieuwVoornaam', autocomplete: 'off' });
  const achternaam = el('input', { type: 'text', id: 'nieuwAchternaam', autocomplete: 'off' });
  const formulier = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      if (!voornaam.value.trim() || !achternaam.value.trim()) return toast('Vul voor- en achternaam in.');
      await api.kindBewaren({ klas_id: s.klas.id, voornaam: voornaam.value.trim(), achternaam: achternaam.value.trim() });
      toast(`${voornaam.value.trim()} is toegevoegd.`);
      toonScherm();
    },
  },
  el('div', { className: 'formulier-rij' },
    el('div', {}, el('label', { for: 'nieuwVoornaam' }, 'Voornaam'), voornaam),
    el('div', {}, el('label', { for: 'nieuwAchternaam' }, 'Achternaam'), achternaam)),
  el('button', { type: 'submit', className: 'knop hoofd breed', style: 'margin-top:14px' }, 'Kind toevoegen'));

  houder.replaceChildren(
    el('div', { className: 'kaart' }, el('h2', {}, `Kinderen (${kinderen.length})`), el('div', { style: 'margin-top:12px' }, zoek), lijst),
    el('div', { className: 'kaart' }, el('h2', {}, 'Kind toevoegen'), formulier));
}

async function schermFiche(houder, kindId) {
  const fiche = await api.fiche(kindId, VAN, TOT);
  if (!fiche.kind) throw new Error('Dit kind bestaat niet (meer).');
  const { kind } = fiche;
  // Bij het openen van een kind: de maand van de laatste inzending, anders de huidige maand.
  if (s.ficheKind !== kindId || !maanden.includes(s.ficheMaand)) {
    s.ficheKind = kindId;
    const d = fiche.inzendingen[0]?.details ?? {};
    const laatste = Object.keys(d).find((k) => /^\d{4}-\d{2}$/.test(k)) ?? (d.erbij?.[0] ?? d.eraf?.[0])?.slice(0, 7);
    s.ficheMaand = maanden.includes(laatste) ? laatste
      : maanden.includes(maandVan(vandaag)) ? maandVan(vandaag) : maanden[0];
  }
  const m = s.ficheMaand;
  const opvang = new Set(fiche.opvang);

  const kalMaaltijd = el('div');
  const kalOpvang = el('div');
  tekenKalender(kalMaaltijd, m, vandaag, (d) => {
    const inhoud = maaltijdInhoud(fiche.maaltijden[d]);
    return { uit: !MAALTIJDDAGEN.includes(weekdag(d)) || !!s.vrij[d] || !inhoud, vrij: s.vrij[d] ?? null,
      klasse: inhoud?.klasse, letter: inhoud?.letter, dommelen: inhoud?.dommelen, titel: inhoud?.label };
  });
  tekenKalender(kalOpvang, m, vandaag, (d) => {
    const aan = opvang.has(d);
    return { uit: !aan, vrij: s.vrij[d] ?? null, klasse: aan ? 'o-aan' : null,
      letter: aan ? (weekdag(d) === 3 ? 'tot 14u' : 'opvang') : null };
  });
  // In de fiche is alles alleen-lezen; gekleurde dagen niet uitgegrijsd tonen.
  for (const k of [...kalMaaltijd.querySelectorAll('.dag'), ...kalOpvang.querySelectorAll('.dag')]) {
    if (k.className.match(/m-|o-aan/)) k.classList.remove('uit');
    k.disabled = true;
  }

  const aantalMaaltijden = Object.keys(fiche.maaltijden).filter((d) => maandVan(d) === m).length;
  const aantalOpvang = fiche.opvang.filter((d) => maandVan(d) === m).length;

  const voornaam = el('input', { type: 'text', id: 'ficheVoornaam', value: kind.voornaam });
  const achternaam = el('input', { type: 'text', id: 'ficheAchternaam', value: kind.achternaam });

  houder.replaceChildren(
    el('button', { type: 'button', className: 'link terug', onclick: () => { location.hash = 'kinderen'; } }, '‹ Alle kinderen'),
    el('div', { className: 'kaart' },
      el('h1', {}, `${kind.voornaam} ${kind.achternaam}`),
      el('div', { className: 'maanden', style: 'margin-top:14px' }, maanden.map((maand) => el('button', {
        type: 'button', className: 'maand' + (maand === m ? ' actief' : ''), 'aria-pressed': String(maand === m),
        onclick: () => { s.ficheMaand = maand; toonScherm(); },
      }, el('b', {}, maandKort(maand)), el('small', {}, maand.slice(0, 4))))),
      el('div', { className: 'fiche-kalenders' },
        el('div', {}, el('h3', {}, `Maaltijden ${maandLabel(m)} (${aantalMaaltijden})`), kalMaaltijd,
          el('div', { className: 'legende' },
            el('span', {}, keuzeBol('warm'), 'Warm'), el('span', {}, keuzeBol('vegi'), 'Vegi'),
            el('span', {}, keuzeBol('boterhammen'), 'Boterhammen'),
            el('span', {}, el('span', { className: 'bol legende-maan' }, maanIcoon()), 'Dommelen'))),
        el('div', {}, el('h3', {}, `Opvang ${maandLabel(m)} (${aantalOpvang})`), kalOpvang))),
    el('div', { className: 'kaart' },
      el('h2', {}, 'Laatste inzendingen'),
      el('div', { style: 'margin-top:8px' }, fiche.inzendingen.length
        ? fiche.inzendingen.map((i) => el('div', { className: 'inzending' },
          el('span', { className: `label-soort ${i.soort}` }, i.soort === 'maaltijden' ? 'Maaltijden' : 'Opvang'),
          i.samenvatting.replace(/^(Maaltijden|Opvang) /, ''),
          el('small', {}, tijdstipLabel(i.tijdstip))))
        : el('p', { className: 'klein' }, 'Nog niets ingevuld.'))),
    el('div', { className: 'kaart' },
      el('h2', {}, 'Gegevens'),
      el('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          if (!voornaam.value.trim() || !achternaam.value.trim()) return toast('Vul voor- en achternaam in.');
          await api.kindBewaren({ id: kind.id, voornaam: voornaam.value.trim(), achternaam: achternaam.value.trim() });
          toast('Bewaard.');
          toonScherm();
        },
      },
      el('div', { className: 'formulier-rij' },
        el('div', {}, el('label', { for: 'ficheVoornaam' }, 'Voornaam'), voornaam),
        el('div', {}, el('label', { for: 'ficheAchternaam' }, 'Achternaam'), achternaam)),
      el('div', { className: 'opties-rij', style: 'margin-top:14px' },
        el('button', { type: 'submit', className: 'knop hoofd' }, 'Bewaren'),
        el('button', {
          type: 'button', className: 'knop', onclick: async () => {
            if (!(await bevestig('Van de lijst halen?', `${kind.voornaam} verdwijnt uit de keuzelijst van de ouders. Wat al ingevuld was, blijft bewaard.`, 'Van de lijst halen'))) return;
            await api.kindVerwijderen(kind.id);
            toast(`${kind.voornaam} staat niet meer op de lijst.`);
            location.hash = 'kinderen';
          },
        }, 'Van de lijst halen')))));
}

async function schermKlas(houder) {
  const school = el('input', { type: 'text', id: 'klasSchool', value: s.klas.school });
  const naam = el('input', { type: 'text', id: 'klasNaam', value: s.klas.naam });
  const leerjaar = el('input', { type: 'text', id: 'klasLeerjaar', value: s.klas.leerjaar, placeholder: 'bv. Peuters' });
  const ouderLink = new URL('../', location.href).href.replace(/[?#].*$/, '');
  const nieuw = el('input', { type: 'password', id: 'nieuwWachtwoord', autocomplete: 'new-password' });

  houder.replaceChildren(
    el('div', { className: 'kaart' },
      el('h2', {}, 'Klas'),
      el('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          Object.assign(s.klas, { school: school.value.trim(), naam: naam.value.trim(), leerjaar: leerjaar.value.trim() });
          await api.klasBewaren(s.klas);
          $('klasTitel').textContent = s.klas.naam;
          toast('Bewaard.');
        },
      },
      el('label', { for: 'klasSchool' }, 'School'), school,
      el('label', { for: 'klasNaam' }, 'Klasnaam'), naam,
      el('label', { for: 'klasLeerjaar' }, 'Leerjaar'), leerjaar,
      el('button', { type: 'submit', className: 'knop hoofd breed', style: 'margin-top:18px' }, 'Bewaren'))),
    el('div', { className: 'kaart' },
      el('h2', {}, 'Link voor de ouders'),
      el('p', { className: 'uitleg' }, ouderLink),
      el('button', {
        type: 'button', className: 'knop breed', style: 'margin-top:12px', onclick: async () => {
          try { await navigator.clipboard.writeText(ouderLink); toast('Link gekopieerd.'); } catch { toast('Kopiëren lukte niet.'); }
        },
      }, 'Link kopiëren')),
    el('div', { className: 'kaart' },
      el('h2', {}, 'Wachtwoord wijzigen'),
      el('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          if (nieuw.value.length < 6) return toast('Kies minstens 6 tekens.');
          try {
            await api.wachtwoordWijzigen(nieuw.value);
            nieuw.value = '';
            toast('Wachtwoord gewijzigd.');
          } catch (fout) { toast(fout.message); }
        },
      },
      el('label', { for: 'nieuwWachtwoord' }, 'Nieuw wachtwoord'), nieuw,
      el('button', { type: 'submit', className: 'knop breed', style: 'margin-top:14px' }, 'Wijzigen'))));
}

async function schermVrij(houder) {
  const datum = el('input', { type: 'date', id: 'vrijDatum', min: VAN, max: TOT });
  const omschrijving = el('input', { type: 'text', id: 'vrijOmschrijving', placeholder: 'bv. Pedagogische studiedag' });
  const eigen = s.vrijLijst.filter((v) => v.school_id);
  const officieel = s.vrijLijst.filter((v) => !v.school_id);

  houder.replaceChildren(
    el('div', { className: 'kaart' },
      el('h2', {}, 'Vrije dag toevoegen'),
      el('p', { className: 'uitleg' }, 'Studiedagen en andere dagen zonder school. Ouders kunnen die dag niets invullen.'),
      el('form', {
        onsubmit: async (e) => {
          e.preventDefault();
          if (!datum.value || !omschrijving.value.trim()) return toast('Vul datum en omschrijving in.');
          try {
            await api.vrijeDagToevoegen(s.klas.school_id, datum.value, omschrijving.value.trim());
          } catch (fout) {
            return toast(/duplicate|al in de lijst/.test(fout.message) ? 'Die dag staat al in de lijst.' : fout.message);
          }
          await laadVrijeDagen();
          toast('Toegevoegd.');
          toonScherm();
        },
      },
      el('label', { for: 'vrijDatum' }, 'Datum'), datum,
      el('label', { for: 'vrijOmschrijving' }, 'Omschrijving'), omschrijving,
      el('button', { type: 'submit', className: 'knop hoofd breed', style: 'margin-top:14px' }, 'Toevoegen'))),
    el('div', { className: 'kaart' },
      el('h2', {}, 'Vrije dagen van de school'),
      el('div', { style: 'margin-top:8px' }, eigen.length ? eigen.map((v) => el('div', { className: 'vrije-dag' },
        el('span', {}, el('b', {}, langeDatum(v.datum)), el('small', {}, v.omschrijving)),
        el('button', {
          type: 'button', className: 'knop klein-knop', onclick: async () => {
            if (!(await bevestig('Vrije dag verwijderen?', `${langeDatum(v.datum)}: ${v.omschrijving}`, 'Verwijderen'))) return;
            await api.vrijeDagVerwijderen(v.id);
            await laadVrijeDagen();
            toonScherm();
          },
        }, 'Verwijderen'))) : el('p', { className: 'klein' }, 'Nog geen.'))),
    el('div', { className: 'kaart' },
      el('h2', {}, 'Officiële Vlaamse schoolkalender'),
      el('p', { className: 'uitleg' }, 'Automatisch grijs voor de ouders.'),
      el('ul', { className: 'vrije-lijst' }, groepeer(officieel).map((g) => el('li', {},
        `${g.naam}: ${g.van === g.tot ? korteDatum(g.van) : `${korteDatum(g.van)} tot ${korteDatum(g.tot)}`}`)))));
}

function groepeer(dagen) {
  const groepen = [];
  for (const v of dagen) {
    const laatste = groepen.at(-1);
    if (laatste && laatste.naam === v.omschrijving) laatste.tot = v.datum;
    else groepen.push({ naam: v.omschrijving, van: v.datum, tot: v.datum });
  }
  return groepen;
}

async function schermMeldingen(houder) {
  const iPhone = /iPhone|iPad/.test(navigator.userAgent);
  const opBeginscherm = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const kan = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const toestemming = kan ? Notification.permission : 'niet';

  const stappen = [];
  if (iPhone && !opBeginscherm) {
    stappen.push(el('p', { className: 'uitleg' },
      'Op een iPhone werken meldingen alleen als deze site op het beginscherm staat. Tik in Safari op het deelicoon en kies "Zet op beginscherm". Open de site daarna via dat icoon en kom terug naar dit scherm.'));
  } else if (!kan) {
    stappen.push(el('p', { className: 'uitleg' }, 'Deze browser ondersteunt geen meldingen.'));
  } else {
    stappen.push(
      el('p', { className: 'uitleg' }, toestemming === 'granted'
        ? 'Meldingen staan aan op dit toestel. Bij elke inzending van een ouder krijg je een melding; een tik erop opent de fiche van het kind.'
        : toestemming === 'denied'
          ? 'Meldingen zijn geweigerd. Zet ze aan in Instellingen, Meldingen, Konijnenklas.'
          : 'Krijg een melding op dit toestel telkens een ouder iets verstuurt.'),
      el('div', { className: 'opties-rij', style: 'margin-top:14px' },
        el('button', { type: 'button', className: 'knop hoofd', disabled: toestemming === 'denied', onclick: meldingenAanzetten },
          toestemming === 'granted' ? 'Opnieuw koppelen' : 'Meldingen aanzetten'),
        el('button', {
          type: 'button', className: 'knop', disabled: toestemming !== 'granted', onclick: async () => {
            try {
              const n = await api.testMelding();
              toast(n ? 'Testmelding verstuurd.' : 'Geen gekoppelde toestellen gevonden.');
            } catch (fout) { toast(fout.message); }
          },
        }, 'Testmelding')));
  }
  houder.replaceChildren(el('div', { className: 'kaart' }, el('h2', {}, 'Meldingen'), ...stappen));
}

async function meldingenAanzetten() {
  if (DEMO) return toast('In de demo kan je geen meldingen aanzetten.');
  try {
    const toestemming = await Notification.requestPermission();
    if (toestemming !== 'granted') return toonScherm();
    const registratie = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const abonnement = await registratie.pushManager.subscribe({
      userVisibleOnly: true, applicationServerKey: base64NaarBytes(CONFIG.vapidPubliek),
    });
    await api.pushBewaren(abonnement, /iPhone/.test(navigator.userAgent) ? 'iPhone' : navigator.platform);
    toast('Meldingen staan aan.');
  } catch (fout) {
    toast(`Meldingen aanzetten lukte niet: ${fout.message}`);
  }
  toonScherm();
}

function base64NaarBytes(tekst) {
  const opgevuld = (tekst + '='.repeat((4 - (tekst.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(opgevuld), (c) => c.charCodeAt(0));
}

// Rood bolletje op het icoon wissen zodra de app open is (de service worker telt op).
async function bolletjeWissen() {
  if (document.visibilityState !== 'visible') return;
  try {
    await navigator.clearAppBadge?.();
    await (await caches.open('konijnenklas-badge')).delete('teller');
  } catch { /* niet ondersteund: niets te wissen */ }
}

// ---------------------------------------------------------------------------
// Dialoog en toast
// ---------------------------------------------------------------------------

function bevestig(titel, tekst, jaTekst) {
  const dialoog = $('bevestig');
  $('bevestigTitel').textContent = titel;
  $('bevestigTekst').replaceChildren(el('p', {}, tekst));
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

$('aanmeldForm').addEventListener('submit', aanmelden);
$('afmelden').addEventListener('click', async () => { await api.afmelden(); location.hash = ''; toonAanmelden(); });
document.querySelectorAll('.nav .tab').forEach((t) => t.addEventListener('click', () => { location.hash = t.dataset.scherm; }));
document.addEventListener('visibilitychange', bolletjeWissen);
bolletjeWissen();
window.addEventListener('hashchange', () => { if (!$('app').hidden) { window.scrollTo(0, 0); toonScherm(); } });

themaKnop($('themaKnop'));
start();
