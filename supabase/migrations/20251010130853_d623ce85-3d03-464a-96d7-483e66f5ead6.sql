-- Seed ingredients migration (idempotent)
-- Creates unique index and seeds 11 core ingredients

do $$ begin
  if not exists (select 1 from pg_indexes where indexname = 'ingredients_name_unique') then
    create unique index ingredients_name_unique on public.ingredients (name);
  end if;
end $$;

with src as (
  select * from jsonb_to_recordset(
  '[
    {"name":"Sucrose","category":"sugar","tags":["core"],"water_pct":0,"sugars_pct":100,"fat_pct":0,"msnf_pct":0,"other_solids_pct":0,"sugar_split":{"sucrose":1},"sp_coeff":100,"pac_coeff":1.0,"cost_per_kg":60},
    {"name":"Dextrose (Glucose)","category":"sugar","tags":["core"],"water_pct":0,"sugars_pct":100,"fat_pct":0,"msnf_pct":0,"other_solids_pct":0,"sugar_split":{"dextrose":1},"sp_coeff":70,"pac_coeff":1.9,"cost_per_kg":75},
    {"name":"Glucose Syrup DE60","category":"sugar","tags":["syrup","DE60"],"water_pct":20,"sugars_pct":80,"fat_pct":0,"msnf_pct":0,"other_solids_pct":0,"sugar_split":{"dextrose":0.60,"oligos":0.40},"sp_coeff":75,"pac_coeff":1.9,"cost_per_kg":85},
    {"name":"Mango Alphonso Pulp","category":"fruit","tags":["indian","alphonso"],"water_pct":82,"sugars_pct":16,"fat_pct":0.5,"msnf_pct":0,"other_solids_pct":1.5,"sugar_split":{"glucose":0.25,"fructose":0.45,"sucrose":0.30},"sp_coeff":100,"pac_coeff":1.0,"cost_per_kg":140},
    {"name":"Litchi Pulp","category":"fruit","tags":["indian"],"water_pct":82,"sugars_pct":16,"fat_pct":0,"msnf_pct":0,"other_solids_pct":2,"sugar_split":{"glucose":0.22,"fructose":0.48,"sucrose":0.30},"sp_coeff":100,"pac_coeff":1.0,"cost_per_kg":130},
    {"name":"Gulab Jamun Paste","category":"flavor","tags":["indian","paste"],"water_pct":25,"sugars_pct":60,"fat_pct":8,"msnf_pct":5,"other_solids_pct":2,"sugar_split":{"sucrose":0.85,"glucose":0.08,"fructose":0.07},"sp_coeff":100,"pac_coeff":1.0,"cost_per_kg":220},
    {"name":"Rabri Paste","category":"dairy","tags":["indian","paste"],"water_pct":40,"sugars_pct":30,"fat_pct":15,"msnf_pct":12,"other_solids_pct":3,"sugar_split":{"lactose":0.60,"sucrose":0.40},"sp_coeff":80,"pac_coeff":0.8,"cost_per_kg":280},
    {"name":"Jalebi Syrup Base","category":"flavor","tags":["indian","syrup"],"water_pct":20,"sugars_pct":78,"fat_pct":0,"msnf_pct":0,"other_solids_pct":2,"sugar_split":{"sucrose":0.80,"glucose":0.10,"fructose":0.10},"sp_coeff":105,"pac_coeff":1.0,"cost_per_kg":90},
    {"name":"Guar Gum","category":"stabilizer","tags":["hydrocolloid"],"water_pct":0,"sugars_pct":0,"fat_pct":0,"msnf_pct":0,"other_solids_pct":100,"sugar_split":null,"sp_coeff":0,"pac_coeff":0,"cost_per_kg":950},
    {"name":"Locust Bean Gum (LBG)","category":"stabilizer","tags":["hydrocolloid"],"water_pct":0,"sugars_pct":0,"fat_pct":0,"msnf_pct":0,"other_solids_pct":100,"sugar_split":null,"sp_coeff":0,"pac_coeff":0,"cost_per_kg":1400},
    {"name":"κ-Carrageenan","category":"stabilizer","tags":["hydrocolloid"],"water_pct":0,"sugars_pct":0,"fat_pct":0,"msnf_pct":0,"other_solids_pct":100,"sugar_split":null,"sp_coeff":0,"pac_coeff":0,"cost_per_kg":1200}
  ]'::jsonb
  ) as x(
    name text, category text, tags text[], water_pct numeric, sugars_pct numeric, fat_pct numeric,
    msnf_pct numeric, other_solids_pct numeric, sugar_split jsonb, sp_coeff numeric, pac_coeff numeric, cost_per_kg numeric, notes text
  )
)
insert into public.ingredients
  (name, category, tags, notes, water_pct, sugars_pct, fat_pct, msnf_pct, other_solids_pct, sugar_split, sp_coeff, pac_coeff, cost_per_kg)
select name, category, coalesce(tags,'{}'::text[]), notes, water_pct, sugars_pct, fat_pct, msnf_pct, other_solids_pct, sugar_split, sp_coeff, pac_coeff, cost_per_kg
from src
on conflict (name) do update
set category = excluded.category,
    tags = excluded.tags,
    water_pct = excluded.water_pct,
    sugars_pct = excluded.sugars_pct,
    fat_pct = excluded.fat_pct,
    msnf_pct = excluded.msnf_pct,
    other_solids_pct = excluded.other_solids_pct,
    sugar_split = excluded.sugar_split,
    sp_coeff = excluded.sp_coeff,
    pac_coeff = excluded.pac_coeff,
    cost_per_kg = excluded.cost_per_kg;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'ingredients_read_all') then
    create policy ingredients_read_all on public.ingredients for select using (true);
  end if;
end $$;