-- Recipe versioning migration (idempotent)
-- Add is_public column to recipes if not exists
alter table public.recipes add column if not exists is_public boolean not null default false;

-- Create recipe_versions table if not exists (with all necessary columns)
create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version_number integer not null,
  name text not null,
  rows_json jsonb not null,
  metrics jsonb,
  change_notes text,
  profile_id text,
  profile_version text default '2025',
  product_type text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  user_id uuid not null default auth.uid()
);

-- Enable RLS on recipe_versions if not already enabled
do $$ begin
  if not exists (
    select 1 from pg_tables 
    where schemaname = 'public' 
    and tablename = 'recipe_versions'
    and rowsecurity = true
  ) then
    alter table public.recipe_versions enable row level security;
  end if;
end $$;

-- Create RLS policies for recipe_versions (if not exists)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'recipe_versions' and policyname = 'Users can read own recipe versions') then
    create policy "Users can read own recipe versions" on public.recipe_versions
      for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'recipe_versions' and policyname = 'Users can insert own recipe versions') then
    create policy "Users can insert own recipe versions" on public.recipe_versions
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- Create auto-increment version trigger function if not exists
create or replace function public.increment_recipe_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Get the next version number for this recipe
  select coalesce(max(version_number), 0) + 1
  into new.version_number
  from public.recipe_versions
  where recipe_id = new.recipe_id;
  
  return new;
end;
$$;

-- Create trigger if not exists
do $$ begin
  if not exists (
    select 1 from pg_trigger 
    where tgname = 'set_version_number'
  ) then
    create trigger set_version_number
      before insert on public.recipe_versions
      for each row
      execute function public.increment_recipe_version();
  end if;
end $$;

-- Add index for faster version lookups
create index if not exists idx_recipe_versions_recipe_id 
  on public.recipe_versions(recipe_id);

create index if not exists idx_recipe_versions_user_id 
  on public.recipe_versions(user_id);