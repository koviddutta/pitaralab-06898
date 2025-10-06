-- Seed comprehensive ingredient library for MeethaPitara
-- Using gen_random_uuid() for IDs, storing string IDs as tags for reference

INSERT INTO public.ingredients (name, category, water_pct, fat_pct, msnf_pct, sugars_pct, other_solids_pct, sp_coeff, pac_coeff, cost_per_kg, notes, tags) VALUES
-- Core Sugars
('Sucrose', 'sugar', 0, 0, NULL, 100, 0, 1.00, 100, 45, NULL, ARRAY['sweetener', 'baseline', 'id:sucrose']::text[]),
('Dextrose', 'sugar', 0, 0, NULL, 100, 0, 0.74, 190, 55, NULL, ARRAY['sweetener', 'high-pac', 'id:dextrose']::text[]),
('Fructose', 'sugar', 0, 0, NULL, 100, 0, 1.73, 190, 120, NULL, ARRAY['sweetener', 'high-sweet', 'id:fructose']::text[]),
('Invert Sugar', 'sugar', 25, 0, NULL, 75, 0, 1.25, 190, 65, NULL, ARRAY['sweetener', 'liquid', 'id:invert_sugar']::text[]),
('Glucose Syrup DE60', 'sugar', 20, 0, NULL, 80, 0, 0.50, 118, 38, NULL, ARRAY['sweetener', 'syrup', 'id:glucose_de60']::text[]),
('Lactose', 'sugar', 0, 0, NULL, 100, 0, 0.16, 62, 85, NULL, ARRAY['sweetener', 'dairy-sugar', 'id:lactose']::text[]),

-- Sugar Toolbox
('Maltodextrin DE19', 'sugar', 5, 0, NULL, 95, 0, 0.05, 12, 48, 'Adds body without sweetness. Typical dosage: 2-4%', ARRAY['body', 'low-sweet', 'id:maltodextrin_de19']::text[]),
('Inulin HP', 'other', 5, 0, NULL, 0, 95, 0, 5, 280, 'Prebiotic fiber. Improves texture. Max dosage: 3-5%', ARRAY['fiber', 'prebiotic', 'id:inulin_hp']::text[]),
('Polydextrose', 'other', 10, 0, NULL, 0, 90, 0.1, 8, 320, 'Sugar replacer. Adds bulk and body. Max dosage: 4-6%', ARRAY['fiber', 'sugar-replacer', 'id:polydextrose']::text[]),
('Sorbitol', 'sugar', 0, 0, NULL, 100, 0, 0.60, 180, 150, 'Sugar alcohol. Humectant. May cause laxative effect >10g/serve', ARRAY['sugar-alcohol', 'humectant', 'id:sorbitol']::text[]),
('Glycerol (Glycerin)', 'other', 0, 0, NULL, 0, 100, 0.6, 75, 95, 'Humectant. Prevents ice crystal formation. Max dosage: 2-3%', ARRAY['humectant', 'id:glycerol']::text[]),

-- Dairy Products
('Milk 3% fat', 'dairy', 88.7, 3, 8.5, 0, 0, NULL, NULL, 25, NULL, ARRAY['dairy', 'liquid', 'id:milk_3']::text[]),
('Cream 25% fat', 'dairy', 68.2, 25, 6.8, 0, 0, NULL, NULL, 120, NULL, ARRAY['dairy', 'liquid', 'id:cream_25']::text[]),
('Skim Milk Powder', 'dairy', 3.5, 1, 93, 0, 0, NULL, NULL, 180, NULL, ARRAY['dairy', 'powder', 'id:smp']::text[]),
('Heavy Cream', 'dairy', 57.3, 38, 4.7, 0, 0, NULL, NULL, 180, NULL, ARRAY['dairy', 'liquid', 'id:heavy_cream']::text[]),
('Whole Milk', 'dairy', 87.4, 3.7, 8.9, 0, 0, NULL, NULL, 28, NULL, ARRAY['dairy', 'liquid', 'id:whole_milk']::text[]),

-- Stabilizers
('Stabilizer Blend', 'stabilizer', 0, 0, NULL, 0, 100, NULL, NULL, 850, 'Typical dosage: 0.3-0.6%. Blend of LBG, guar, carrageenan', ARRAY['stabilizer', 'id:stabilizer']::text[]),
('Locust Bean Gum (LBG)', 'stabilizer', 10, 0, NULL, 0, 90, NULL, NULL, 950, 'Hydrate at 70-85°C. Synergistic with carrageenan. Dosage: 0.1-0.3%', ARRAY['stabilizer', 'gum', 'id:lbg']::text[]),
('Guar Gum', 'stabilizer', 10, 0, NULL, 0, 90, NULL, NULL, 420, 'Hydrate at room temp. Quick viscosity build. Dosage: 0.1-0.25%', ARRAY['stabilizer', 'gum', 'id:guar_gum']::text[]),
('Carrageenan (Iota)', 'stabilizer', 12, 0, NULL, 0, 88, NULL, NULL, 780, 'Hydrate at 75-80°C. Prevents wheying off. Dosage: 0.02-0.1%', ARRAY['stabilizer', 'gum', 'id:carrageenan']::text[]),

-- Fruits with Sugar Splits
('Mango Pulp (Alphonso)', 'fruit', 82.3, 0.4, NULL, 14.8, 2.5, NULL, NULL, 180, 'King of fruits. Rich aroma', ARRAY['fruit', 'indian', 'premium', 'id:mango_alphonso']::text[]),
('Strawberry Puree', 'fruit', 90.95, 0.3, NULL, 7.68, 1.07, NULL, NULL, 240, 'High acidity. Delicate flavor', ARRAY['fruit', 'berry', 'id:strawberry']::text[]),
('Raspberry Puree', 'fruit', 85.75, 0.65, NULL, 9.5, 4.1, NULL, NULL, 580, 'Very acidic. Intense flavor. Seeds present', ARRAY['fruit', 'berry', 'premium', 'id:raspberry']::text[]),
('Banana Puree', 'fruit', 74.91, 0.33, NULL, 22.84, 1.92, NULL, NULL, 120, 'Low acidity. Rich body. Browning prone', ARRAY['fruit', 'id:banana']::text[]),
('Pineapple Puree', 'fruit', 86.0, 0.12, NULL, 11.82, 2.06, NULL, NULL, 160, 'Tropical aroma. Bromelain enzyme present', ARRAY['fruit', 'tropical', 'id:pineapple']::text[]),
('Lemon Juice', 'fruit', 92.31, 0.3, NULL, 2.52, 4.87, NULL, NULL, 95, 'Very high acidity. Brightens flavors. Use sparingly', ARRAY['fruit', 'citrus', 'id:lemon']::text[]),
('Orange Juice', 'fruit', 88.3, 0.2, NULL, 9.35, 2.15, NULL, NULL, 110, 'Citrus burst. Balance sweet-tart', ARRAY['fruit', 'citrus', 'id:orange']::text[]),
('Passion Fruit Pulp', 'fruit', 72.93, 0.7, NULL, 11.2, 15.17, NULL, NULL, 420, 'Intense aroma. High fiber/seeds. Exotic flavor', ARRAY['fruit', 'tropical', 'premium', 'id:passion_fruit']::text[]),
('Litchi Pulp', 'fruit', 81.76, 0.44, NULL, 16.53, 1.27, NULL, NULL, 220, 'Floral notes. Delicate. Low acidity', ARRAY['fruit', 'asian', 'id:litchi']::text[]),

-- Indian Flavor Pastes
('Gulab Jamun Paste', 'flavor', 41.6, 5.4, 8.1, 42.52, 3.38, 0.85, 125, 320, NULL, ARRAY['indian', 'sweet', 'paste', 'id:gulab_jamun_paste']::text[]),
('Gulab Jamun (pieces)', 'flavor', 30, 6, 8, 51.9, 4.1, 0.90, 135, 280, NULL, ARRAY['indian', 'sweet', 'id:gulab_jamun']::text[]),
('Rabri', 'flavor', 53.6, 18, 9.56, 14.36, 7.84, 0.75, 95, 450, NULL, ARRAY['indian', 'dairy', 'sweet', 'id:rabri']::text[]),
('Jalebi', 'flavor', 38.55, 6.36, 2.36, 34.55, 18.18, 0.95, 145, 350, NULL, ARRAY['indian', 'sweet', 'id:jalebi']::text[]),

-- Flavor Components
('Cocoa Powder (Dutch)', 'flavor', 0, 23, NULL, 0.5, 62.4, 0.1, 15, 680, NULL, ARRAY['chocolate', 'flavor', 'id:cocoa_dp']::text[]),
('Egg Yolks', 'other', 50.4, 31.9, NULL, 0, 17.7, 0.1, 25, 450, NULL, ARRAY['emulsifier', 'protein', 'id:egg_yolks']::text[]),
('Vanilla Extract', 'flavor', 65, 0, NULL, 0, 35, 0.2, 30, 3200, NULL, ARRAY['flavor', 'premium', 'id:vanilla_extract']::text[]);

-- Add sugar_split as JSONB for fruits
UPDATE public.ingredients SET sugar_split = '{"glucose": 2, "fructose": 4.5, "sucrose": 8.3}'::jsonb WHERE 'id:mango_alphonso' = ANY(tags);
UPDATE public.ingredients SET sugar_split = '{"glucose": 2.0, "fructose": 2.4, "sucrose": 3.28}'::jsonb WHERE 'id:strawberry' = ANY(tags);
UPDATE public.ingredients SET sugar_split = '{"glucose": 2.35, "fructose": 2.45, "sucrose": 4.7}'::jsonb WHERE 'id:raspberry' = ANY(tags);
UPDATE public.ingredients SET sugar_split = '{"glucose": 4.98, "fructose": 4.85, "sucrose": 13.01}'::jsonb WHERE 'id:banana' = ANY(tags);
UPDATE public.ingredients SET sugar_split = '{"glucose": 2.0, "fructose": 1.85, "sucrose": 7.97}'::jsonb WHERE 'id:pineapple' = ANY(tags);
UPDATE public.ingredients SET sugar_split = '{"glucose": 0.5, "fructose": 0.6, "sucrose": 1.42}'::jsonb WHERE 'id:lemon' = ANY(tags);
UPDATE public.ingredients SET sugar_split = '{"glucose": 2.25, "fructose": 2.55, "sucrose": 4.55}'::jsonb WHERE 'id:orange' = ANY(tags);
UPDATE public.ingredients SET sugar_split = '{"glucose": 3.6, "fructose": 4.2, "sucrose": 3.4}'::jsonb WHERE 'id:passion_fruit' = ANY(tags);
UPDATE public.ingredients SET sugar_split = '{"glucose": 5.8, "fructose": 6.2, "sucrose": 4.53}'::jsonb WHERE 'id:litchi' = ANY(tags);