-- Add characterization_pct column to ingredients table for analytical compensation
ALTER TABLE public.ingredients 
ADD COLUMN characterization_pct numeric DEFAULT 0 CHECK (characterization_pct >= 0 AND characterization_pct <= 100);

COMMENT ON COLUMN public.ingredients.characterization_pct IS 'Percentage of inclusion used for flavor characterization (0-100). Used in analytical compensation framework for adjusting sugar/AFP targets based on flavoring class.';