-- Create AI usage log table for rate limiting
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own usage logs
CREATE POLICY "Users can read their own AI usage logs"
ON public.ai_usage_log
FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own usage logs
CREATE POLICY "Users can insert their own AI usage logs"
ON public.ai_usage_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient rate limit queries
CREATE INDEX idx_ai_usage_log_user_time 
ON public.ai_usage_log(user_id, created_at DESC);