// Publieke instellingen. De anon-sleutel en de VAPID-publieke sleutel mogen openbaar zijn:
// de database laat ouders alleen via de ouder_*-functies binnen.
export const CONFIG = {
  supabaseUrl: '',
  supabaseSleutel: '',
  // Vast e-mailadres van de leerkrachtgebruiker in Supabase; de leerkracht typt alleen het wachtwoord.
  leerkrachtEmail: 'leerkracht@konijnenklas.lvit.be',
  vapidPubliek: '',
};
