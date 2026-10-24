// Publieke instellingen. De anon-sleutel en de VAPID-publieke sleutel mogen openbaar zijn:
// de database laat ouders alleen via de ouder_*-functies binnen.
export const CONFIG = {
  supabaseUrl: 'https://nhpfvjkptfghldibteer.supabase.co',
  supabaseSleutel: 'sb_publishable_h8zZ0UK7LkSjloLXjHud1A_Fp9j5GKT',
  // Vast e-mailadres van de leerkrachtgebruiker in Supabase; de leerkracht typt alleen het wachtwoord.
  leerkrachtEmail: 'leerkracht@konijnenklas.lvit.be',
  vapidPubliek: 'BGHoRtWPSf-a_ue0rpQ3vc4v87fbXusR-rA-t6X5e78tORh5jB5HwKoRrNgcokqOp4d_aI9LuSXJ4xBssHsbo9w',
};
