/*
  # Add Multi-Tenant Company Workspaces

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, company name)
      - `twilio_phone_number` (text, tracking number)
      - `twilio_account_sid` (text)
      - `twilio_auth_token` (text, encrypted)
      - `plan` (text: free, starter, pro, enterprise)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `company_members`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `user_id` (uuid, references profiles)
      - `role` (text: owner, admin, sales_rep)
      - `created_at` (timestamp)
      - Unique constraint on (company_id, user_id)

  2. Changes to Existing Tables
    - Add `company_id` to: profiles, calls, leads, appointments, pipeline_stages
    - Update RLS policies to check company membership
    - Add indexes for company_id lookups

  3. Security
    - Enable RLS on companies and company_members
    - Users can only access data from their company
    - Owners can manage company settings
    - Admins can manage users and data
    - Sales reps can only view/edit their own data
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  twilio_phone_number text,
  twilio_account_sid text,
  twilio_auth_token text,
  plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create company_members table
CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'sales_rep',
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Add company_id to existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE calls ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pipeline_stages' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE pipeline_stages ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own calls" ON calls;
DROP POLICY IF EXISTS "Users can insert own calls" ON calls;
DROP POLICY IF EXISTS "Users can update own calls" ON calls;
DROP POLICY IF EXISTS "Users can delete own calls" ON calls;
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can view own pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Users can insert own pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Users can update own pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Users can delete own pipeline stages" ON pipeline_stages;

-- Companies policies
CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Company members policies
CREATE POLICY "Users can view members of their company"
  ON company_members FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage members"
  ON company_members FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Profiles policies
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Calls policies
CREATE POLICY "Users can view calls in their company"
  ON calls FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calls for their company"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calls in their company"
  ON calls FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete calls in their company"
  ON calls FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Leads policies
CREATE POLICY "Users can view leads in their company"
  ON leads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert leads for their company"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update leads in their company"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leads in their company"
  ON leads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Appointments policies
CREATE POLICY "Users can view appointments in their company"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert appointments for their company"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update appointments in their company"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete appointments in their company"
  ON appointments FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

-- Pipeline stages policies
CREATE POLICY "Users can view pipeline stages in their company"
  ON pipeline_stages FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage pipeline stages"
  ON pipeline_stages FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Create indexes for company lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_company_id ON calls(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company_id ON pipeline_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);

-- Add helper function to get user's company
CREATE OR REPLACE FUNCTION get_user_company_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM company_members WHERE user_id = user_uuid LIMIT 1;
$$;
