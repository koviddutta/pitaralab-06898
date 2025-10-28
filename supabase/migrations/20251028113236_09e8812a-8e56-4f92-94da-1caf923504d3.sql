-- Remove water and lactose columns from recipe_rows
ALTER TABLE public.recipe_rows 
DROP COLUMN IF EXISTS water_g,
DROP COLUMN IF EXISTS lactose_g;

-- Remove water and lactose columns from calculated_metrics
ALTER TABLE public.calculated_metrics
DROP COLUMN IF EXISTS total_water_g,
DROP COLUMN IF EXISTS total_lactose_g,
DROP COLUMN IF EXISTS water_pct,
DROP COLUMN IF EXISTS lactose_pct;