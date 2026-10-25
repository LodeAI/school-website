-- Wanneer opende de leerkracht de app laatst? Het rode bolletje op het icoon telt de inzendingen
-- sinds dat moment. De Edge Function "melding" stuurt dat getal mee in de pushmelding, zodat iOS het
-- bolletje zelf zet (declarative web push), ook als de service worker niet draait.
create table public.leerkracht_geopend (
  id smallint primary key default 1 check (id = 1),
  tijdstip timestamptz not null default now()
);
insert into public.leerkracht_geopend (id, tijdstip) values (1, now());

alter table public.leerkracht_geopend enable row level security;
revoke all on public.leerkracht_geopend from anon;
create policy leerkracht on public.leerkracht_geopend for all to authenticated using (true) with check (true);
