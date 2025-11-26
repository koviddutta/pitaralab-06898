-- Phase 1: Database Cleanup - Drop Unused Tables

-- Drop unused feature tables
DROP TABLE IF EXISTS public.batches CASCADE;
DROP TABLE IF EXISTS public.pastes CASCADE;
DROP TABLE IF EXISTS public.base_recipes CASCADE;
DROP TABLE IF EXISTS public.recipe_versions CASCADE;
DROP TABLE IF EXISTS public.balance_events CASCADE;
DROP TABLE IF EXISTS public.analysis_history CASCADE;
DROP TABLE IF EXISTS public.optimization_presets CASCADE;
DROP TABLE IF EXISTS public.pairing_feedback CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.ingredient_access_log CASCADE;

-- Drop inventory-related tables (feature not implemented)
DROP TABLE IF EXISTS public.inventory_alerts CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.ingredient_inventory CASCADE;
DROP TABLE IF EXISTS public.ingredient_costs CASCADE;

-- Drop production planning tables (feature not implemented)
DROP TABLE IF EXISTS public.production_plans CASCADE;

-- Consolidate AI events - merge ai_suggestion_events into events
-- First, migrate any existing data from ai_suggestion_events to events
INSERT INTO public.events (user_id, event, meta, created_at)
SELECT 
  user_id,
  'ai_suggestion' as event,
  jsonb_build_object(
    'ingredient', ingredient,
    'accepted', accepted,
    'reason', reason
  ) as meta,
  created_at
FROM public.ai_suggestion_events
ON CONFLICT DO NOTHING;

-- Drop the redundant ai_suggestion_events table
DROP TABLE IF EXISTS public.ai_suggestion_events CASCADE;

-- Comment: Kept 6 core tables for recipe management:
-- 1. ingredients (ingredient database)
-- 2. recipes (recipe metadata)
-- 3. recipe_rows (recipe ingredients)
-- 4. calculated_metrics (recipe calculations)
-- 5. recipe_outcomes (ML training data)
-- 6. events (unified event tracking including AI usage via ai_usage_log)
-- 7. ai_usage_log (AI rate limiting)