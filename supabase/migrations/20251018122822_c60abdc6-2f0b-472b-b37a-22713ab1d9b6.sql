-- Fix security warnings - drop trigger first, then function

-- 1. Drop trigger first
DROP TRIGGER IF EXISTS trigger_update_ml_score ON recipes;

-- 2. Now drop and recreate function with search_path
DROP FUNCTION IF EXISTS update_recipe_ml_score();
CREATE OR REPLACE FUNCTION update_recipe_ml_score()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT AVG(
    CASE 
      WHEN outcome = 'success' THEN 100
      WHEN outcome = 'needs_improvement' THEN 70
      ELSE 40
    END
  )::INTEGER INTO NEW.ml_score
  FROM recipe_outcomes
  WHERE recipe_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 3. Recreate trigger
CREATE TRIGGER trigger_update_ml_score
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_ml_score();

-- 4. Fix refresh_ml_training_dataset function
DROP FUNCTION IF EXISTS refresh_ml_training_dataset();
CREATE OR REPLACE FUNCTION refresh_ml_training_dataset()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ml_training_dataset;
END;
$$;

-- 5. Hide materialized view from API
REVOKE ALL ON ml_training_dataset FROM anon, authenticated;
GRANT SELECT ON ml_training_dataset TO service_role;