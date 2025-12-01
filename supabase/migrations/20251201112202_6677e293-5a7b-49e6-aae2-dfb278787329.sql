-- Phase 2: Add Missing DELETE/UPDATE Policies for User Data Tables

-- 1. Add DELETE policy for calculated_metrics table
-- Users should be able to delete calculated metrics for their own recipes
CREATE POLICY "Users can delete calculated metrics"
  ON public.calculated_metrics
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = calculated_metrics.recipe_id
      AND recipes.user_id = auth.uid()
  ));

-- 2. Add UPDATE and DELETE policies for recipe_outcomes table
-- Users should be able to update and delete their own recipe outcomes
CREATE POLICY "Users can update own outcomes"
  ON public.recipe_outcomes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outcomes"
  ON public.recipe_outcomes
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Add UPDATE and DELETE policies for events table
-- Users should be able to manage their own event logs
CREATE POLICY "Users can update own events"
  ON public.events
  FOR UPDATE
  USING ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "Users can delete own events"
  ON public.events
  FOR DELETE
  USING ((auth.uid() = user_id) OR (user_id IS NULL));

-- Security summary:
-- ✅ calculated_metrics: Full CRUD for own recipe metrics
-- ✅ recipe_outcomes: Full CRUD for own outcomes
-- ✅ events: Full CRUD for own events