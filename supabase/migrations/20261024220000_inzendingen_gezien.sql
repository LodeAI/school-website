-- Heeft de leerkracht de fiche van het kind al bekeken sinds deze inzending?
-- De kinderlijst toont een rode M (maaltijden) of blauwe O (opvang) zolang iets niet gezien is.
alter table public.inzendingen add column gezien boolean not null default false;
update public.inzendingen set gezien = true; -- alles van voor deze wijziging geldt als gezien
create index inzendingen_ongezien on public.inzendingen (kind_id) where not gezien;
