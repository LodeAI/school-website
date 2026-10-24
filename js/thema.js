// Lichte of donkere modus, bewaard in een cookie op het toestel. Standaard licht.
// Het scriptje in de <head> van elke pagina zet het thema al voor de eerste tekening.

const PAD = new URL('../', import.meta.url).pathname; // de hoofdmap van de site, voor beide pagina's
const MAAN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const ZON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>';

const donker = () => document.documentElement.dataset.thema === 'donker';

function toon(knop) {
  knop.innerHTML = donker() ? ZON : MAAN;
  knop.setAttribute('aria-label', donker() ? 'Lichte modus' : 'Donkere modus');
  knop.title = knop.getAttribute('aria-label');
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', donker() ? '#20272a' : '#ffffff');
}

export function themaKnop(knop) {
  toon(knop);
  knop.addEventListener('click', () => {
    const nieuw = donker() ? 'licht' : 'donker';
    document.documentElement.dataset.thema = nieuw;
    const veilig = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `thema=${nieuw}; path=${PAD}; max-age=31536000; SameSite=Lax${veilig}`;
    toon(knop);
  });
}
