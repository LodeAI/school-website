-- Keuzelijst voor ouders gesorteerd op achternaam, dan voornaam (getoond als "Voornaam Achternaam").
create or replace function public.ouder_kinderen(p_klas uuid)
returns table (id uuid, voornaam text, achternaam text)
language sql stable security definer set search_path = public as $$
  select id, voornaam, achternaam
  from kinderen
  where klas_id = p_klas and actief
  order by lower(achternaam), lower(voornaam)
$$;
