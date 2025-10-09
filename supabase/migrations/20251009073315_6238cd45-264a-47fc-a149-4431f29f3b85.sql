-- Security Fix: Add user ownership to recipes, batches, and pastes tables
-- This ensures users can only access their own data

-- Step 1: Add user_id columns
ALTER TABLE public.recipes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.batches ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.pastes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Set default for new rows
ALTER TABLE public.recipes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.batches ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.pastes ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Step 3: Backfill existing data (assign to system/first user if exists, otherwise leave NULL temporarily)
-- Note: Existing rows will need user_id assignment before making NOT NULL
UPDATE public.recipes SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;
UPDATE public.batches SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;
UPDATE public.pastes SET user_id = auth.uid() WHERE user_id IS NULL AND auth.uid() IS NOT NULL;

-- Step 4: Make NOT NULL (only if all rows have user_id)
-- We'll make this conditional to avoid errors if there's orphaned data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE user_id IS NULL) THEN
    ALTER TABLE public.recipes ALTER COLUMN user_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.batches WHERE user_id IS NULL) THEN
    ALTER TABLE public.batches ALTER COLUMN user_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pastes WHERE user_id IS NULL) THEN
    ALTER TABLE public.pastes ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Step 5: Drop old overly-permissive policies and create owner-scoped policies

-- RECIPES TABLE
DROP POLICY IF EXISTS "Authenticated users can read all recipes" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can update recipes" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can delete recipes" ON public.recipes;

CREATE POLICY "Users can read own recipes"
ON public.recipes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
ON public.recipes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
ON public.recipes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
ON public.recipes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- BATCHES TABLE
DROP POLICY IF EXISTS "Authenticated users can read all batches" ON public.batches;
DROP POLICY IF EXISTS "Authenticated users can insert batches" ON public.batches;
DROP POLICY IF EXISTS "Authenticated users can update batches" ON public.batches;
DROP POLICY IF EXISTS "Authenticated users can delete batches" ON public.batches;

CREATE POLICY "Users can read own batches"
ON public.batches FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own batches"
ON public.batches FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batches"
ON public.batches FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own batches"
ON public.batches FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- PASTES TABLE
DROP POLICY IF EXISTS "Authenticated users can read all pastes" ON public.pastes;
DROP POLICY IF EXISTS "Authenticated users can insert pastes" ON public.pastes;
DROP POLICY IF EXISTS "Authenticated users can update pastes" ON public.pastes;
DROP POLICY IF EXISTS "Authenticated users can delete pastes" ON public.pastes;

CREATE POLICY "Users can read own pastes"
ON public.pastes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pastes"
ON public.pastes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pastes"
ON public.pastes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pastes"
ON public.pastes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_user_id ON public.batches(user_id);
CREATE INDEX IF NOT EXISTS idx_pastes_user_id ON public.pastes(user_id);

-- Note: recipe_versions already has proper policies tied to created_by
-- Ingredients and ingredient_access_log are correctly configured for shared/logged access