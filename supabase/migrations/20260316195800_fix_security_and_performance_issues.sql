/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing indexes on all foreign keys to improve query performance
    - Optimize RLS policies to use (select auth.uid()) instead of auth.uid()
    - Fix function search paths to be immutable
    
  2. Index Additions
    - appointments: company_id, user_id foreign keys
    - calls: company_id, user_id foreign keys
    - company_members: user_id foreign key
    - lead_activities: company_id, lead_id foreign keys
    - leads: company_id, user_id foreign keys
    - pipeline_stages: company_id foreign key
    - profiles: company_id foreign key
    - sms_messages: call_id, company_id, lead_id foreign keys
    
  3. RLS Policy Optimizations
    - Update subscription and payment_history policies to cache auth.uid() result
    - This prevents re-evaluation for each row, improving performance at scale
    
  4. Function Search Path Fixes
    - Make function search paths immutable for security
    - Recreate triggers after updating functions
*/

-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_company_id ON calls(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_id ON lead_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company_id ON pipeline_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_call_id ON sms_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_company_id ON sms_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_lead_id ON sms_messages(lead_id);

-- Drop and recreate subscription policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Company members can view company subscription" ON subscriptions;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Company members can view company subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id IN (
        SELECT id FROM profiles WHERE id = (select auth.uid())
      )
    )
  );

-- Drop and recreate payment_history policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;
DROP POLICY IF EXISTS "Company members can view company payment history" ON payment_history;

CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Company members can view company payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT s.id FROM subscriptions s
      INNER JOIN company_members cm ON s.company_id = cm.company_id
      INNER JOIN profiles p ON cm.user_id = p.id
      WHERE p.id = (select auth.uid())
    )
  );

-- Fix function search paths to be immutable
-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- Recreate the function with immutable search path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fix get_user_company_id function if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_company_id') THEN
    DROP FUNCTION get_user_company_id(uuid) CASCADE;
    
    CREATE OR REPLACE FUNCTION get_user_company_id(user_uuid uuid)
    RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $func$
    DECLARE
      company_uuid uuid;
    BEGIN
      SELECT company_id INTO company_uuid
      FROM profiles
      WHERE id = user_uuid;
      
      RETURN company_uuid;
    END;
    $func$;
  END IF;
END $$;

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_company_date ON calls(company_id, call_date DESC);
CREATE INDEX IF NOT EXISTS idx_leads_company_status ON leads(company_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_company_start ON appointments(company_id, start_time);
CREATE INDEX IF NOT EXISTS idx_sms_messages_company_created ON sms_messages(company_id, created_at DESC);