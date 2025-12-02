-- Phase 3: Add CASCADE DELETE for referential integrity
-- This ensures that when a recipe is deleted, all related data is automatically cleaned up

-- Drop existing foreign key constraints and recreate with CASCADE DELETE
ALTER TABLE public.recipe_rows 
  DROP CONSTRAINT IF EXISTS recipe_rows_recipe_id_fkey;

ALTER TABLE public.recipe_rows
  ADD CONSTRAINT recipe_rows_recipe_id_fkey 
  FOREIGN KEY (recipe_id) 
  REFERENCES public.recipes(id) 
  ON DELETE CASCADE;

ALTER TABLE public.calculated_metrics
  DROP CONSTRAINT IF EXISTS calculated_metrics_recipe_id_fkey;

ALTER TABLE public.calculated_metrics
  ADD CONSTRAINT calculated_metrics_recipe_id_fkey
  FOREIGN KEY (recipe_id)
  REFERENCES public.recipes(id)
  ON DELETE CASCADE;

ALTER TABLE public.recipe_outcomes
  DROP CONSTRAINT IF EXISTS recipe_outcomes_recipe_id_fkey;

ALTER TABLE public.recipe_outcomes
  ADD CONSTRAINT recipe_outcomes_recipe_id_fkey
  FOREIGN KEY (recipe_id)
  REFERENCES public.recipes(id)
  ON DELETE CASCADE;

-- Security summary:
-- ✅ Automatic cleanup of recipe_rows when recipe is deleted
-- ✅ Automatic cleanup of calculated_metrics when recipe is deleted  
-- ✅ Automatic cleanup of recipe_outcomes when recipe is deleted
-- ✅ Prevents orphaned data and simplifies application code