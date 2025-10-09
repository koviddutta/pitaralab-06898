-- Fix: Set security_invoker=on for ingredients_public view to respect RLS

-- Drop and recreate the view with security_invoker enabled
DROP VIEW IF EXISTS public.ingredients_public;

CREATE OR REPLACE VIEW public.ingredients_public
WITH (security_invoker=on)
AS
SELECT 
  id, name, category, water_pct, fat_pct, msnf_pct,
  sugars_pct, other_solids_pct, sp_coeff, pac_coeff,
  notes, tags, sugar_split, created_at, updated_at
  -- Explicitly exclude cost_per_kg
FROM public.ingredients;

-- Grant access to public view
GRANT SELECT ON public.ingredients_public TO anon;
GRANT SELECT ON public.ingredients_public TO authenticated;