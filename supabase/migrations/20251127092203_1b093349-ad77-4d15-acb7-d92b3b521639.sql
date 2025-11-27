-- Drop database functions that reference deleted tables

-- Drop function for recipe_versions table (table dropped in Phase 1)
DROP FUNCTION IF EXISTS public.increment_recipe_version() CASCADE;

-- Drop trigger function for ingredient_access_log table (table dropped in Phase 1)
DROP FUNCTION IF EXISTS public.log_ingredient_access() CASCADE;

-- Drop function for recipe_versions/recipe_outcomes (table dropped in Phase 1)
DROP FUNCTION IF EXISTS public.update_recipe_ml_score() CASCADE;

-- Note: Keeping has_role() and get_ingredient_with_cost() as they may be useful for future RBAC
-- Note: Keeping refresh_ml_training_dataset() for future ML features
-- Note: Keeping update_updated_at_column() as it's a generic utility function