-- Drop the ingredients_public view as it bypasses security
-- The main ingredients table already has proper RLS policies
DROP VIEW IF EXISTS public.ingredients_public;

-- The ingredients table already has proper RLS:
-- - Authenticated users can read all ingredient data
-- - Public users can read non-sensitive ingredient data
-- Both policies exist and will handle access control properly