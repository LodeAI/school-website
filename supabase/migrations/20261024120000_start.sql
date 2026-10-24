-- Konijnenklas: tabellen, toegangsregels en functies voor ouders en leerkracht.
--
-- Ouders hebben geen rechtstreekse toegang tot de tabellen. Ze gaan altijd via de
-- functies ouder_*, die de achternaam controleren en de deadlines bewaken.
-- De leerkracht meldt aan (rol authenticated) en mag alles lezen en beheren.

create extension if not exists pg_net with schema extensions;

-- Schema dat niet via de API bereikbaar is: instellingen en hulpfuncties.
create schema if not exists privaat;
revoke all on schema privaat from public, anon, authenticated;

create table privaat.instellingen (
  sleutel text primary key,
  waarde  text not null
);

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table public.scholen (
  id   uuid primary key default gen_random_uuid(),
  naam text not null
);

create table public.klassen (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.scholen on delete cascade,
  naam      text not null,
  leerjaar  text not null default '',
  actief    boolean not null default true
);

create table public.kinderen (
  id         uuid primary key default gen_random_uuid(),
  klas_id    uuid not null references public.klassen on delete cascade,
  voornaam   text not null,
  achternaam text not null,
  actief     boolean not null default true,
  aangemaakt timestamptz not null default now()
);
create index kinderen_klas on public.kinderen (klas_id);

-- school_id leeg = officiële Vlaamse schoolkalender, anders een vrije dag van die school.
create table public.vrije_dagen (
  id           bigint generated always as identity primary key,
  school_id    uuid references public.scholen on delete cascade,
  datum        date not null,
  omschrijving text not null
);
create unique index vrije_dagen_uniek
  on public.vrije_dagen (coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid), datum);

create table public.maaltijden (
  kind_id    uuid not null references public.kinderen on delete cascade,
  datum      date not null,
  keuze      text not null check (keuze in (
    'dommelen_warm', 'dommelen_vegi', 'dommelen_boterhammen', 'warm', 'vegi', 'boterhammen')),
  bijgewerkt timestamptz not null default now(),
  primary key (kind_id, datum)
);

create table public.opvang (
  kind_id    uuid not null references public.kinderen on delete cascade,
  datum      date not null,
  bijgewerkt timestamptz not null default now(),
  primary key (kind_id, datum)
);

-- Elke verstuurde wijziging; een nieuwe rij stuurt een melding naar de leerkracht.
create table public.inzendingen (
  id           bigint generated always as identity primary key,
  kind_id      uuid not null references public.kinderen on delete cascade,
  soort        text not null check (soort in ('maaltijden', 'opvang')),
  samenvatting text not null,
  details      jsonb not null default '{}',
  tijdstip     timestamptz not null default now()
);
create index inzendingen_kind on public.inzendingen (kind_id, tijdstip desc);

-- Toestellen van de leerkracht die pushmeldingen krijgen.
create table public.push_abonnementen (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  toestel    text not null default '',
  aangemaakt timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Toegang: alleen de aangemelde leerkracht, ouders nooit rechtstreeks
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['scholen', 'klassen', 'kinderen', 'vrije_dagen', 'maaltijden',
                           'opvang', 'inzendingen', 'push_abonnementen'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy leerkracht on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Hulpfuncties
-- ---------------------------------------------------------------------------

create or replace function privaat.vandaag() returns date
language sql stable as $$
  select (now() at time zone 'Europe/Brussels')::date
$$;

-- Eerste dag van het schooljaar rond een datum; in juli en augustus is dat het komende schooljaar.
create or replace function privaat.schooljaar_start(d date) returns date
language sql immutable as $$
  select make_date(extract(year from d)::int - case when extract(month from d) >= 7 then 0 else 1 end, 9, 1)
$$;

create or replace function privaat.maandnaam(d date) returns text
language sql immutable as $$
  select (array['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus',
                'september', 'oktober', 'november', 'december'])[extract(month from d)::int]
         || ' ' || extract(year from d)::int
$$;

-- "ma 2 nov"
create or replace function privaat.korte_dag(d date) returns text
language sql immutable as $$
  select (array['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'])[extract(isodow from d)::int]
         || ' ' || extract(day from d)::int || ' '
         || (array['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'])[extract(month from d)::int]
$$;

-- "ma 2 nov, di 3 nov en nog 4"
create or replace function privaat.dagenlijst(dagen date[]) returns text
language sql immutable as $$
  select string_agg(privaat.korte_dag(d), ', ' order by d)
         || case when cardinality(dagen) > 4 then ' en nog ' || (cardinality(dagen) - 4) else '' end
  from (select d from unnest(dagen) d order by d limit 4) x
$$;

create or replace function privaat.is_vrije_dag(p_school uuid, d date) returns boolean
language sql stable as $$
  select exists (select 1 from public.vrije_dagen
                 where datum = d and (school_id is null or school_id = p_school))
$$;

-- Controleert de achternaam (hoofdletters en spaties maken niet uit) en geeft de school terug.
create or replace function privaat.kind_controle(p_kind uuid, p_achternaam text) returns uuid
language plpgsql stable as $$
declare
  v_school uuid;
begin
  select k.school_id into v_school
  from public.kinderen c
  join public.klassen k on k.id = c.klas_id
  where c.id = p_kind and c.actief and k.actief
    and regexp_replace(lower(btrim(c.achternaam)), '\s+', ' ', 'g')
      = regexp_replace(lower(btrim(coalesce(p_achternaam, ''))), '\s+', ' ', 'g');
  if v_school is null then
    raise exception 'De achternaam klopt niet.' using hint = 'verificatie';
  end if;
  return v_school;
end $$;

-- ---------------------------------------------------------------------------
-- Functies voor ouders
-- ---------------------------------------------------------------------------

create or replace function public.ouder_klassen()
returns table (id uuid, naam text, leerjaar text, school text)
language sql stable security definer set search_path = public as $$
  select k.id, k.naam, k.leerjaar, s.naam
  from klassen k join scholen s on s.id = k.school_id
  where k.actief
  order by s.naam, k.naam
$$;

create or replace function public.ouder_kinderen(p_klas uuid)
returns table (id uuid, voornaam text, achternaam text)
language sql stable security definer set search_path = public as $$
  select id, voornaam, achternaam
  from kinderen
  where klas_id = p_klas and actief
  order by lower(voornaam), lower(achternaam)
$$;

-- Alles wat de ouderpagina nodig heeft voor het lopende schooljaar.
create or replace function public.ouder_gegevens(p_kind uuid, p_achternaam text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_school  uuid := privaat.kind_controle(p_kind, p_achternaam);
  v_vandaag date := privaat.vandaag();
  v_van     date := privaat.schooljaar_start(v_vandaag);
  v_tot     date := (v_van + interval '10 months' - interval '1 day')::date;
begin
  return jsonb_build_object(
    'vandaag', v_vandaag,
    'schooljaar_start', v_van,
    'maaltijden', coalesce((select jsonb_object_agg(datum, keuze) from maaltijden
                            where kind_id = p_kind and datum between v_van and v_tot), '{}'),
    'opvang', coalesce((select jsonb_agg(datum order by datum) from opvang
                        where kind_id = p_kind and datum between v_van and v_tot), '[]'),
    'vrije_dagen', coalesce((select jsonb_object_agg(datum, omschrijving) from (
                               select distinct on (datum) datum, omschrijving from vrije_dagen
                               where (school_id is null or school_id = v_school)
                                 and datum between v_van and v_tot
                               order by datum, school_id nulls first) x), '{}'),
    'laatst_verstuurd', jsonb_build_object(
      'maaltijden', (select max(tijdstip) from inzendingen where kind_id = p_kind and soort = 'maaltijden'),
      'opvang',     (select max(tijdstip) from inzendingen where kind_id = p_kind and soort = 'opvang'))
  );
end $$;

-- p_maanden: eerste dag van elke maand die verstuurd wordt.
-- p_keuzes:  {"2026-12-01": "warm", ...}, de volledige stand van die maanden.
create or replace function public.ouder_maaltijden_versturen(
  p_kind uuid, p_achternaam text, p_maanden date[], p_keuzes jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_school  uuid := privaat.kind_controle(p_kind, p_achternaam);
  v_vandaag date := privaat.vandaag();
  v_maand   date;
  v_einde   date;
  v_rij     record;
  v_oud     jsonb;
  v_nieuw   jsonb;
  v_namen   text[] := '{}';
  v_details jsonb := '{}';
begin
  if coalesce(cardinality(p_maanden), 0) = 0 then
    raise exception 'Er is geen maand gekozen.';
  end if;
  p_keuzes := coalesce(p_keuzes, '{}');

  foreach v_maand in array p_maanden loop
    if v_maand <> date_trunc('month', v_maand)::date or extract(month from v_maand) in (7, 8) then
      raise exception 'Ongeldige maand.';
    end if;
    if v_maand <= v_vandaag then
      raise exception '% is al begonnen en kan niet meer aangepast worden.', privaat.maandnaam(v_maand)
        using hint = 'vergrendeld';
    end if;
  end loop;

  for v_rij in select key::date as datum, value #>> '{}' as keuze from jsonb_each(p_keuzes) loop
    if not (date_trunc('month', v_rij.datum)::date = any (p_maanden)) then
      raise exception '% hoort niet bij de verstuurde maanden.', v_rij.datum;
    end if;
    if extract(isodow from v_rij.datum) not in (1, 2, 4, 5) or privaat.is_vrije_dag(v_school, v_rij.datum) then
      raise exception 'Op % kan je geen maaltijd kiezen.', privaat.korte_dag(v_rij.datum);
    end if;
    if v_rij.keuze is null or v_rij.keuze not in (
        'dommelen_warm', 'dommelen_vegi', 'dommelen_boterhammen', 'warm', 'vegi', 'boterhammen') then
      raise exception 'Onbekende keuze op %.', privaat.korte_dag(v_rij.datum);
    end if;
  end loop;

  foreach v_maand in array (select array_agg(distinct m order by m) from unnest(p_maanden) m) loop
    v_einde := (v_maand + interval '1 month')::date;
    select coalesce(jsonb_object_agg(datum, keuze), '{}') into v_oud
    from maaltijden where kind_id = p_kind and datum >= v_maand and datum < v_einde;
    select coalesce(jsonb_object_agg(key, value), '{}') into v_nieuw
    from jsonb_each(p_keuzes) where key::date >= v_maand and key::date < v_einde;

    if v_oud is distinct from v_nieuw then
      delete from maaltijden where kind_id = p_kind and datum >= v_maand and datum < v_einde;
      insert into maaltijden (kind_id, datum, keuze)
      select p_kind, key::date, value #>> '{}' from jsonb_each(v_nieuw);
      v_namen := v_namen || privaat.maandnaam(v_maand);
      v_details := v_details || jsonb_build_object(to_char(v_maand, 'YYYY-MM'), v_nieuw);
    end if;
  end loop;

  if cardinality(v_namen) = 0 then
    return jsonb_build_object('gewijzigd', false);
  end if;
  insert into inzendingen (kind_id, soort, samenvatting, details)
  values (p_kind, 'maaltijden', 'Maaltijden ' || array_to_string(v_namen, ', '), v_details);
  return jsonb_build_object('gewijzigd', true);
end $$;

-- p_dagen: alle gekozen opvangdagen tussen p_van en p_tot. Dagen tot en met vandaag
-- liggen vast en blijven ongemoeid, wat er ook doorgestuurd wordt.
create or replace function public.ouder_opvang_versturen(
  p_kind uuid, p_achternaam text, p_van date, p_tot date, p_dagen date[])
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_school uuid := privaat.kind_controle(p_kind, p_achternaam);
  v_vanaf  date := greatest(p_van, privaat.vandaag() + 1);
  v_dag    date;
  v_oud    date[];
  v_nieuw  date[];
  v_erbij  date[];
  v_eraf   date[];
  v_tekst  text[] := '{}';
begin
  if p_van is null or p_tot is null or p_tot - p_van > 400 then
    raise exception 'Ongeldige periode.';
  end if;
  if p_tot < v_vanaf then
    return jsonb_build_object('gewijzigd', false);
  end if;

  foreach v_dag in array coalesce(p_dagen, '{}') loop
    if v_dag between v_vanaf and p_tot
       and (extract(isodow from v_dag) > 5 or privaat.is_vrije_dag(v_school, v_dag)) then
      raise exception 'Op % is er geen opvang.', privaat.korte_dag(v_dag);
    end if;
  end loop;

  select coalesce(array_agg(datum order by datum), '{}') into v_oud
  from opvang where kind_id = p_kind and datum between v_vanaf and p_tot;
  select coalesce(array_agg(distinct d order by d), '{}') into v_nieuw
  from unnest(coalesce(p_dagen, '{}')) d where d between v_vanaf and p_tot;
  select coalesce(array_agg(d order by d), '{}') into v_erbij from unnest(v_nieuw) d where not (d = any (v_oud));
  select coalesce(array_agg(d order by d), '{}') into v_eraf  from unnest(v_oud)   d where not (d = any (v_nieuw));

  if cardinality(v_erbij) = 0 and cardinality(v_eraf) = 0 then
    return jsonb_build_object('gewijzigd', false);
  end if;

  delete from opvang where kind_id = p_kind and datum = any (v_eraf);
  insert into opvang (kind_id, datum) select p_kind, unnest(v_erbij);

  if cardinality(v_erbij) > 0 then v_tekst := v_tekst || ('erbij: ' || privaat.dagenlijst(v_erbij)); end if;
  if cardinality(v_eraf)  > 0 then v_tekst := v_tekst || ('eraf: '  || privaat.dagenlijst(v_eraf));  end if;
  insert into inzendingen (kind_id, soort, samenvatting, details)
  values (p_kind, 'opvang', 'Opvang ' || array_to_string(v_tekst, '; '),
          jsonb_build_object('erbij', to_jsonb(v_erbij), 'eraf', to_jsonb(v_eraf)));
  return jsonb_build_object('gewijzigd', true);
end $$;

revoke execute on all functions in schema public from public;
grant execute on function public.ouder_klassen(), public.ouder_kinderen(uuid),
  public.ouder_gegevens(uuid, text),
  public.ouder_maaltijden_versturen(uuid, text, date[], jsonb),
  public.ouder_opvang_versturen(uuid, text, date, date, date[])
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Melding naar de leerkracht bij elke inzending (Edge Function "melding")
-- ---------------------------------------------------------------------------

create or replace function privaat.stuur_melding() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url    text := (select waarde from privaat.instellingen where sleutel = 'melding_url');
  v_geheim text := (select waarde from privaat.instellingen where sleutel = 'melding_geheim');
begin
  if v_url is not null then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('inzending_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-melding-geheim', v_geheim));
  end if;
  return new;
end $$;

create trigger inzending_melding
  after insert on public.inzendingen
  for each row execute function privaat.stuur_melding();

-- ---------------------------------------------------------------------------
-- Startgegevens
-- ---------------------------------------------------------------------------

with s as (insert into public.scholen (naam) values ('De Triangel') returning id)
insert into public.klassen (school_id, naam) select id, 'Konijnenklas' from s;
