-- Seed initial hardening factors for cocoa and chocolate ingredients
-- These values are calibrated starting points and can be tuned in production after data collection

-- Cocoa powder has moderate hardening effect
UPDATE public.ingredients 
SET hardening_factor = 0.18 
WHERE name ILIKE '%cocoa%' AND hardening_factor = 0;

-- Dark chocolate has stronger hardening effect due to higher cocoa solids and fat
UPDATE public.ingredients 
SET hardening_factor = 0.25 
WHERE name ILIKE '%dark%chocolate%' AND hardening_factor = 0;

-- Log the updates
DO $$ 
DECLARE
  cocoa_count INTEGER;
  chocolate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cocoa_count FROM public.ingredients WHERE name ILIKE '%cocoa%' AND hardening_factor = 0.18;
  SELECT COUNT(*) INTO chocolate_count FROM public.ingredients WHERE name ILIKE '%dark%chocolate%' AND hardening_factor = 0.25;
  
  RAISE NOTICE 'Updated % cocoa ingredients with hardening_factor = 0.18', cocoa_count;
  RAISE NOTICE 'Updated % dark chocolate ingredients with hardening_factor = 0.25', chocolate_count;
END $$;