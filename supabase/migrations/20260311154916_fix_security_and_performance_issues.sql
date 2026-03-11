/*
  # Fix Security and Performance Issues

  1. Add Missing Indexes
    - Add indexes for foreign keys that are missing covering indexes
    - This improves query performance for join operations
    
  2. Optimize RLS Policies
    - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
    - This prevents re-evaluation of auth functions for each row
    
  3. Fix Function Search Paths
    - Add SECURITY DEFINER and proper search_path to functions
    
  4. Remove Unused Indexes
    - Drop indexes that are not being used to reduce overhead
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON appointments(created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_by ON lead_activities(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_call_id ON leads(call_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user_id ON pipeline_stages(user_id);

-- Drop unused indexes to reduce overhead
DROP INDEX IF EXISTS idx_calls_call_date;
DROP INDEX IF EXISTS idx_calls_user_id;
DROP INDEX IF EXISTS idx_leads_user_id;
DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_appointments_user_id;
DROP INDEX IF EXISTS idx_appointments_start_time;
DROP INDEX IF EXISTS idx_profiles_company_id;
DROP INDEX IF EXISTS idx_calls_company_id;
DROP INDEX IF EXISTS idx_leads_company_id;
DROP INDEX IF EXISTS idx_appointments_company_id;
DROP INDEX IF EXISTS idx_pipeline_stages_company_id;
DROP INDEX IF EXISTS idx_company_members_company_id;
DROP INDEX IF EXISTS idx_company_members_user_id;
DROP INDEX IF EXISTS idx_calls_call_sid;
DROP INDEX IF EXISTS idx_calls_company_call_date;
DROP INDEX IF EXISTS idx_calls_company_status;
DROP INDEX IF EXISTS idx_calls_ai_processed;
DROP INDEX IF EXISTS idx_lead_activities_lead_id;
DROP INDEX IF EXISTS idx_lead_activities_company_id;
DROP INDEX IF EXISTS idx_lead_activities_created_at;
DROP INDEX IF EXISTS idx_leads_pipeline_stage;
DROP INDEX IF EXISTS idx_appointments_type;
DROP INDEX IF EXISTS idx_sms_messages_company_id;
DROP INDEX IF EXISTS idx_sms_messages_lead_id;
DROP INDEX IF EXISTS idx_sms_messages_call_id;
DROP INDEX IF EXISTS idx_sms_messages_created_at;

-- Fix function search paths
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop and recreate optimized RLS policies for companies
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Owners can update their company" ON companies;

CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Owners can update their company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid()) AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid()) AND role = 'owner'
    )
  );

-- Drop and recreate optimized RLS policies for company_members
DROP POLICY IF EXISTS "Users can view members of their company" ON company_members;
DROP POLICY IF EXISTS "Owners and admins can manage members" ON company_members;

CREATE POLICY "Company members can view members"
  ON company_members FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Owners and admins can manage members"
  ON company_members FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid()) AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- Drop and recreate optimized RLS policies for profiles
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid()) OR
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- Drop and recreate optimized RLS policies for calls
DROP POLICY IF EXISTS "Users can view calls in their company" ON calls;
DROP POLICY IF EXISTS "Users can insert calls for their company" ON calls;
DROP POLICY IF EXISTS "Users can update calls in their company" ON calls;
DROP POLICY IF EXISTS "Users can delete calls in their company" ON calls;

CREATE POLICY "Users can view calls in their company"
  ON calls FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert calls for their company"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update calls in their company"
  ON calls FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete calls in their company"
  ON calls FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

-- Drop and recreate optimized RLS policies for leads
DROP POLICY IF EXISTS "Users can view leads in their company" ON leads;
DROP POLICY IF EXISTS "Users can insert leads for their company" ON leads;
DROP POLICY IF EXISTS "Users can update leads in their company" ON leads;
DROP POLICY IF EXISTS "Users can delete leads in their company" ON leads;

CREATE POLICY "Users can view leads in their company"
  ON leads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert leads for their company"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update leads in their company"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete leads in their company"
  ON leads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

-- Drop and recreate optimized RLS policies for appointments
DROP POLICY IF EXISTS "Users can view appointments in their company" ON appointments;
DROP POLICY IF EXISTS "Users can insert appointments for their company" ON appointments;
DROP POLICY IF EXISTS "Users can update appointments in their company" ON appointments;
DROP POLICY IF EXISTS "Users can delete appointments in their company" ON appointments;

CREATE POLICY "Users can view appointments in their company"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert appointments for their company"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update appointments in their company"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete appointments in their company"
  ON appointments FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

-- Drop and recreate optimized RLS policies for pipeline_stages
DROP POLICY IF EXISTS "Users can view pipeline stages in their company" ON pipeline_stages;
DROP POLICY IF EXISTS "Admins can manage pipeline stages" ON pipeline_stages;

CREATE POLICY "Company members can view pipeline stages"
  ON pipeline_stages FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage pipeline stages"
  ON pipeline_stages FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid()) AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- Drop and recreate optimized RLS policies for lead_activities
DROP POLICY IF EXISTS "Company members can view their lead activities" ON lead_activities;
DROP POLICY IF EXISTS "Company members can create lead activities" ON lead_activities;
DROP POLICY IF EXISTS "Company members can update their lead activities" ON lead_activities;
DROP POLICY IF EXISTS "Company members can delete their lead activities" ON lead_activities;

CREATE POLICY "Company members can view their lead activities"
  ON lead_activities FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Company members can create lead activities"
  ON lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Company members can update their lead activities"
  ON lead_activities FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Company members can delete their lead activities"
  ON lead_activities FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

-- Drop and recreate optimized RLS policies for sms_messages
DROP POLICY IF EXISTS "Company members can view their SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Company members can create SMS messages" ON sms_messages;
DROP POLICY IF EXISTS "Company members can update their SMS messages" ON sms_messages;

CREATE POLICY "Company members can view their SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Company members can create SMS messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Company members can update their SMS messages"
  ON sms_messages FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = (select auth.uid())
    )
  );