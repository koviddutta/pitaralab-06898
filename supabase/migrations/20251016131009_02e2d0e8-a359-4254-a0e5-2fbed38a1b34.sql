-- Add hardening_factor column to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN hardening_factor numeric NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN public.ingredients.hardening_factor IS 'Hardening index for low-temp solid fat effects (e.g., cocoa butter)';