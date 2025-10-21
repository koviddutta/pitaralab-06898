-- Fix ai_usage_log schema (remove tokens_used column that doesn't exist)
-- This fixes the edge function error where it tries to insert non-existent column

-- The ai_usage_log table already has the correct schema:
-- id, user_id, function_name, created_at
-- No migration needed - just fix the edge function code

-- However, let's add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_time 
ON ai_usage_log(user_id, created_at DESC);

-- Fix ingredient cost exposure by creating proper column-level access
-- Note: We keep the view approach since RLS policies can't do column-level security in older Postgres

-- Create a secure function for admins to view costs
CREATE OR REPLACE FUNCTION public.get_ingredient_with_cost(ingredient_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  water_pct numeric,
  sugars_pct numeric,
  fat_pct numeric,
  msnf_pct numeric,
  other_solids_pct numeric,
  sugar_split jsonb,
  sp_coeff numeric,
  pac_coeff numeric,
  notes text,
  cost_per_kg numeric,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  hardening_factor numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    i.id, i.name, i.category, i.water_pct, i.sugars_pct, i.fat_pct,
    i.msnf_pct, i.other_solids_pct, i.sugar_split, i.sp_coeff, i.pac_coeff,
    i.notes, i.cost_per_kg, i.tags, i.created_at, i.updated_at, i.hardening_factor
  FROM public.ingredients i
  WHERE i.id = ingredient_id
    AND has_role(auth.uid(), 'admin');
$$;

COMMENT ON FUNCTION public.get_ingredient_with_cost IS 'Admin-only function to retrieve ingredient data including cost_per_kg';

-- Add pairing_feedback user_id tracking for proper ownership
-- Check if column exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pairing_feedback' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.pairing_feedback 
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    
    -- Set default to current user for new inserts
    ALTER TABLE public.pairing_feedback 
    ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Replace the overly permissive public policy with user-scoped policies
DROP POLICY IF EXISTS "Allow public access to pairing feedback" ON pairing_feedback;

CREATE POLICY "Users can read all pairing feedback aggregates"
ON pairing_feedback FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own pairing feedback"
ON pairing_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own pairing feedback"
ON pairing_feedback FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pairing feedback"
ON pairing_feedback FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMENT ON TABLE pairing_feedback IS 'Stores user feedback on ingredient pairings. Readable by all for aggregate insights, but users can only modify their own entries.';