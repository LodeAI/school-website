-- Officiële Vlaamse schoolkalender (basisonderwijs), bron:
-- https://www.vlaanderen.be/onderwijs-en-vorming/wat-mag-en-moet-op-school/schoolvakanties-vrije-dagen-en-afwezigheden/schoolvakanties
-- Alleen weekdagen worden bewaard; weekends zijn op de site altijd grijs.
-- Voor een nieuw schooljaar: een nieuwe migratie in dezelfde vorm.

insert into public.vrije_dagen (school_id, datum, omschrijving)
select null, d::date, v.omschrijving
from (values
  -- 2026-2027
  ('2026-11-02', '2026-11-08', 'Herfstvakantie'),
  ('2026-11-11', '2026-11-11', 'Wapenstilstand'),
  ('2026-12-21', '2027-01-03', 'Kerstvakantie'),
  ('2027-02-08', '2027-02-14', 'Krokusvakantie'),
  ('2027-03-29', '2027-04-11', 'Paasvakantie'),
  ('2027-05-06', '2027-05-06', 'Hemelvaart'),
  ('2027-05-07', '2027-05-07', 'Vrijdag na Hemelvaart'),
  ('2027-05-17', '2027-05-17', 'Pinkstermaandag'),
  -- 2027-2028
  ('2027-11-01', '2027-11-07', 'Herfstvakantie'),
  ('2027-11-11', '2027-11-11', 'Wapenstilstand'),
  ('2027-12-27', '2028-01-09', 'Kerstvakantie'),
  ('2028-02-28', '2028-03-05', 'Krokusvakantie'),
  ('2028-04-03', '2028-04-17', 'Paasvakantie'),
  ('2028-05-01', '2028-05-01', 'Dag van de Arbeid'),
  ('2028-05-25', '2028-05-25', 'Hemelvaart'),
  ('2028-05-26', '2028-05-26', 'Vrijdag na Hemelvaart'),
  ('2028-06-05', '2028-06-05', 'Pinkstermaandag')
) as v (van, tot, omschrijving)
cross join lateral generate_series(v.van::date, v.tot::date, interval '1 day') as d
where extract(isodow from d) <= 5;
