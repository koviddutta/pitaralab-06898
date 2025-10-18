-- Add indexes for ML performance
CREATE INDEX IF NOT EXISTS idx_recipe_outcomes_user_outcome 
  ON recipe_outcomes(user_id, outcome, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recipe_outcomes_recipe 
  ON recipe_outcomes(recipe_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_function 
  ON ai_usage_log(user_id, function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recipes_user_updated 
  ON recipes(user_id, updated_at DESC);

-- Add computed column for quick ML stats
ALTER TABLE recipes 
  ADD COLUMN IF NOT EXISTS ml_score INTEGER DEFAULT NULL;

-- Create function to auto-update ML score
CREATE OR REPLACE FUNCTION update_recipe_ml_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate average success score from outcomes
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
$$ LANGUAGE plpgsql;

-- Create trigger for ML score updates
DROP TRIGGER IF EXISTS trigger_update_ml_score ON recipes;
CREATE TRIGGER trigger_update_ml_score
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_ml_score();

-- Create materialized view for training data
CREATE MATERIALIZED VIEW IF NOT EXISTS ml_training_dataset AS
SELECT 
  r.id as recipe_id,
  r.name,
  r.product_type,
  r.metrics,
  r.ml_score,
  COUNT(ro.id) as feedback_count,
  AVG(CASE 
    WHEN ro.outcome = 'success' THEN 1.0
    WHEN ro.outcome = 'needs_improvement' THEN 0.7
    ELSE 0.4
  END) as success_rate,
  MAX(ro.created_at) as last_feedback_at
FROM recipes r
LEFT JOIN recipe_outcomes ro ON r.id = ro.recipe_id
WHERE r.metrics IS NOT NULL
GROUP BY r.id, r.name, r.product_type, r.metrics, r.ml_score;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_ml_training_dataset_recipe 
  ON ml_training_dataset(recipe_id);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_ml_training_dataset()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ml_training_dataset;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON MATERIALIZED VIEW ml_training_dataset IS 'Pre-aggregated training data for ML model performance';
COMMENT ON FUNCTION refresh_ml_training_dataset() IS 'Call this to refresh ML training dataset after bulk updates';