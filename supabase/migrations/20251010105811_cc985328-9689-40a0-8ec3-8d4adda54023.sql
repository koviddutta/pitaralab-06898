-- Phase 4 Fixes: Add function_name to index and create ai_suggestion_events table

-- Fix 1: Update index to include function_name for better rate limit queries
DROP INDEX IF EXISTS public.idx_ai_usage_log_user_time;
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_function_time 
ON public.ai_usage_log(user_id, function_name, created_at DESC);

-- Fix 2: Create ai_suggestion_events table for telemetry
CREATE TABLE IF NOT EXISTS public.ai_suggestion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  reason TEXT,
  accepted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_suggestion_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ai_sugg_insert_self' AND tablename='ai_suggestion_events') THEN
    CREATE POLICY ai_sugg_insert_self ON public.ai_suggestion_events
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='ai_sugg_select_self' AND tablename='ai_suggestion_events') THEN
    CREATE POLICY ai_sugg_select_self ON public.ai_suggestion_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_events_user_created 
ON public.ai_suggestion_events(user_id, created_at DESC);

-- Comments
COMMENT ON TABLE public.ai_suggestion_events IS 'Tracks AI suggestion acceptance/rejection for telemetry and improvement';
COMMENT ON COLUMN public.ai_suggestion_events.accepted IS 'True if user added the suggestion, false if explicitly rejected';