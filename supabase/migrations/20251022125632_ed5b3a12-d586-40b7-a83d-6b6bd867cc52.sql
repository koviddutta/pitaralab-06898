-- Fix security issues found in audit (corrected)

-- 1. Require authentication for user_roles table (add to existing policy)
DROP POLICY IF EXISTS "Users can read their own roles" ON user_roles;
CREATE POLICY "Users can read their own roles authenticated" ON user_roles
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2. Restrict pairing_feedback to own data only
DROP POLICY IF EXISTS "Users can read all pairing feedback aggregates" ON pairing_feedback;
CREATE POLICY "Users can read own pairing feedback only" ON pairing_feedback
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- 3. Allow users to read their own events
CREATE POLICY "read_own_events" ON events
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);