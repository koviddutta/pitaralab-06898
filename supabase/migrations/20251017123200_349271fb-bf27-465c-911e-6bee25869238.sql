-- Add label column to recipe_versions for user-friendly naming
alter table public.recipe_versions
  add column if not exists label text;