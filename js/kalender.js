// Datums, maanden en de kalenderweergave, gedeeld door de ouder- en de leerkrachtensite.
// Datums zijn overal tekst in de vorm "2026-11-02"; maanden "2026-11".

export const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
  'augustus', 'september', 'oktober', 'november', 'december'];
export const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const DAGEN_KORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

export const KEUZES = [
  { code: 'dommelen_warm', label: 'Dommelen + warm', soort: 'warm', dommelen: true },
  { code: 'dommelen_vegi', label: 'Dommelen + vegi', soort: 'vegi', dommelen: true },
  { code: 'dommelen_boterhammen', label: 'Dommelen + boterhammen', soort: 'boterhammen', dommelen: true },
  { code: 'warm', label: 'Warm', soort: 'warm', dommelen: false },
  { code: 'vegi', label: 'Vegi', soort: 'vegi', dommelen: false },
  { code: 'boterhammen', label: 'Boterhammen', soort: 'boterhammen', dommelen: false },
];
export const KEUZE = Object.fromEntries(KEUZES.map((k) => [k.code, k]));
const LETTER = { warm: 'W', vegi: 'V', boterhammen: 'B' };

// Weekdagen (1 = maandag) waarop gegeten wordt; woensdag niet.
export const MAALTIJDDAGEN = [1, 2, 4, 5];

const twee = (n) => String(n).padStart(2, '0');

export function vandaagBrussel() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date());
}

export function maandVan(iso) {
  return iso.slice(0, 7);
}

export function weekdag(iso) {
  const [j, m, d] = iso.split('-').map(Number);
  return ((new Date(j, m - 1, d).getDay() + 6) % 7) + 1;
}

export function dagPlus(iso, aantal) {
  const [j, m, d] = iso.split('-').map(Number);
  const datum = new Date(j, m - 1, d + aantal);
  return `${datum.getFullYear()}-${twee(datum.getMonth() + 1)}-${twee(datum.getDate())}`;
}

export function dagenVanMaand(maand) {
  const [j, m] = maand.split('-').map(Number);
  const aantal = new Date(j, m, 0).getDate();
  return Array.from({ length: aantal }, (_, i) => `${maand}-${twee(i + 1)}`);
}

// Tien maanden, september tot en met juni. In juli en augustus: het komende schooljaar.
export function schooljaarMaanden(vandaag) {
  const [j, m] = vandaag.split('-').map(Number);
  const start = m >= 7 ? j : j - 1;
  return Array.from({ length: 10 }, (_, i) => {
    const maand = ((8 + i) % 12) + 1;
    return `${maand >= 9 ? start : start + 1}-${twee(maand)}`;
  });
}

export function maandLabel(maand) {
  const [j, m] = maand.split('-').map(Number);
  return `${MAANDEN[m - 1]} ${j}`;
}

export function maandKort(maand) {
  return MAANDEN_KORT[Number(maand.slice(5, 7)) - 1];
}

export function korteDatum(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${DAGEN_KORT[weekdag(iso) - 1]} ${d} ${MAANDEN_KORT[m - 1]}`;
}

export function langeDatum(iso) {
  const [j, m, d] = iso.split('-').map(Number);
  return `${DAGEN[weekdag(iso) - 1]} ${d} ${MAANDEN[m - 1]} ${j}`;
}

export function laatsteDagVoor(maand) {
  return dagPlus(`${maand}-01`, -1);
}

export function tijdstipLabel(tijdstip) {
  return new Intl.DateTimeFormat('nl-BE', {
    timeZone: 'Europe/Brussels', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(tijdstip));
}

// Inhoud van een dagcirkel bij een maaltijdkeuze.
export function maaltijdInhoud(code) {
  const k = KEUZE[code];
  if (!k) return null;
  return { klasse: `m-${k.soort}`, letter: LETTER[k.soort], dommelen: k.dommelen, label: k.label };
}

// Maantje voor "dommelen".
export function maanIcoon() {
  const maan = document.createElement('span');
  maan.className = 'dag-maan';
  maan.setAttribute('aria-hidden', 'true');
  maan.innerHTML = '<svg viewBox="0 0 16 16"><path d="M10.6 1.8a6.4 6.4 0 1 0 3.6 10.4A5.3 5.3 0 0 1 10.6 1.8z" fill="currentColor"/></svg>';
  return maan;
}

// Bolletje zoals in de kalender, voor knoppen en de legende.
export function keuzeBol(code) {
  const inhoud = maaltijdInhoud(code);
  const bol = el('span', { className: `bol ${inhoud.klasse}`, 'aria-hidden': 'true' }, inhoud.letter);
  if (inhoud.dommelen) bol.append(maanIcoon());
  return bol;
}

// Tekent een maandkalender. dagInfo(iso) geeft per dag:
// { uit: bool, vrij: tekst | null, klasse, letter, dommelen, gekozen, titel }
export function tekenKalender(houder, maand, vandaag, dagInfo, opKlik) {
  houder.replaceChildren();
  const rooster = document.createElement('div');
  rooster.className = 'kalender';
  rooster.setAttribute('role', 'grid');

  DAGEN_KORT.forEach((d, i) => {
    const kop = document.createElement('div');
    kop.className = 'kalender-kop' + (i >= 5 ? ' weekend' : '');
    kop.textContent = d;
    rooster.append(kop);
  });

  const dagen = dagenVanMaand(maand);
  for (let i = 1; i < weekdag(dagen[0]); i++) {
    rooster.append(Object.assign(document.createElement('div'), { className: 'kalender-leeg' }));
  }

  for (const iso of dagen) {
    const info = dagInfo(iso);
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'dag';
    knop.dataset.datum = iso;
    if (info.uit) knop.classList.add('uit');
    if (info.vrij) knop.classList.add('vrij');
    if (info.klasse) knop.classList.add(info.klasse);
    if (info.gekozen) knop.classList.add('gekozen');
    if (iso === vandaag) knop.classList.add('vandaag');
    knop.disabled = !!info.uit;

    const cirkel = document.createElement('span');
    cirkel.className = 'dag-cirkel';
    cirkel.textContent = Number(iso.slice(8));
    if (info.dommelen) cirkel.append(maanIcoon());
    const onder = document.createElement('span');
    onder.className = 'dag-label';
    onder.textContent = info.letter || (iso === vandaag ? 'vandaag' : '');
    knop.append(cirkel, onder);

    const delen = [langeDatum(iso)];
    if (info.titel) delen.push(info.titel);
    if (info.vrij) delen.push(info.vrij);
    knop.title = delen.join(': ');
    knop.setAttribute('aria-label', delen.join(', '));
    if (!info.uit && opKlik) knop.addEventListener('click', () => opKlik(iso));
    rooster.append(knop);
  }
  houder.append(rooster);
}

// Vervangt de inhoud van een element; lege stukken (null, false) worden overgeslagen,
// anders zet de browser er letterlijk "null" neer.
export function vervang(houder, ...kinderen) {
  houder.replaceChildren(...kinderen.flat().filter((k) => k !== null && k !== undefined && k !== false));
}

// Kleine helper om elementen op te bouwen: el('button', { className: 'x', onclick }, 'tekst')
export function el(tag, eigenschappen = {}, ...kinderen) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(eigenschappen)) {
    if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('aria-') || k === 'role' || k === 'for') e.setAttribute(k, v);
    else e[k] = v;
  }
  e.append(...kinderen.flat().filter((k) => k !== null && k !== undefined && k !== false));
  return e;
}
