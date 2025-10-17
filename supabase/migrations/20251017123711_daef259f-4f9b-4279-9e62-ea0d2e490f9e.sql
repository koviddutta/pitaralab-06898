-- Create events table for feature usage analytics (no PII)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event text not null,
  meta jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.events enable row level security;

-- Policy: Users can insert their own events or anonymous events
create policy events_insert_self on public.events
  for insert with check (auth.uid() = user_id or user_id is null);

-- Index for efficient querying
create index if not exists idx_events_created_at on public.events(created_at desc);
create index if not exists idx_events_event on public.events(event);