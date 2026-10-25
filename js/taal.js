// Taal van de ouderpagina, bewaard in een cookie op het toestel. Standaard Nederlands.
// Het scriptje in de <head> van index.html zet de taal al voor de eerste tekening. De leerkrachtensite
// leest de cookie niet en blijft dus altijd Nederlands.

import { TEKSTEN } from './teksten.js';

export const TALEN = [
  ['nl', 'Nederlands'], ['en', 'English'], ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español'], ['it', 'Italiano'], ['ko', '한국어'],
];
const PAD = new URL('../', import.meta.url).pathname; // de hoofdmap van de site, zoals bij het thema

export function taal() {
  const code = document.documentElement.dataset.taal;
  return TEKSTEN[code] ? code : 'nl';
}

// t('sleutel', ...waarden): de tekst in de huidige taal, met terugval op het Nederlands.
export function t(sleutel, ...waarden) {
  const w = TEKSTEN[taal()][sleutel] ?? TEKSTEN.nl[sleutel];
  return typeof w === 'function' ? w(...waarden) : w;
}

// Naam van een vakantie of vrije dag; wat de leerkracht zelf intypt en niet in de lijst staat, blijft zoals het is.
export function vrijeDagNaam(naam) {
  return TEKSTEN[taal()].vrijeDagen?.[naam] ?? naam;
}

// Zet de vaste teksten van de pagina (elementen met data-t) in de huidige taal.
export function vertaalPagina() {
  document.title = t('titel');
  document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = t(e.dataset.t); });
  document.querySelectorAll('[data-t-label]').forEach((e) => { e.setAttribute('aria-label', t(e.dataset.tLabel)); });
  document.documentElement.classList.remove('vertalen');
}

// Keuzelijst rechtsboven: toont de code van de huidige taal, een tik opent de lijst van het toestel.
export function taalKnop(keuze, code, bijWissel) {
  keuze.replaceChildren(...TALEN.map(([c, naam]) => new Option(naam, c, false, c === taal())));
  code.textContent = taal().toUpperCase();
  keuze.addEventListener('change', () => {
    const nieuw = keuze.value;
    const veilig = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `taal=${nieuw}; path=${PAD}; max-age=31536000; SameSite=Lax${veilig}`;
    document.documentElement.dataset.taal = nieuw;
    document.documentElement.lang = t('locale');
    code.textContent = nieuw.toUpperCase();
    vertaalPagina();
    bijWissel();
  });
}
