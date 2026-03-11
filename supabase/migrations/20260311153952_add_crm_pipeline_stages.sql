/*
  # Add CRM Pipeline Stages and Lead Activities

  1. Changes to leads table
    - Add `pipeline_stage` column (enum: new_lead, contacted, quote_sent, measurement_scheduled, installation_scheduled, completed, lost)
    - Add `project_details` jsonb column for storing project-specific information
    - Add `lead_value` numeric column for tracking potential revenue
    - Add `expected_close_date` date column
    - Add `lost_reason` text column (for leads marked as lost)
    
  2. New Tables
    - `lead_activities`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `company_id` (uuid, foreign key to companies)
      - `activity_type` (text: note, email, call, meeting, status_change, etc.)
      - `title` (text)
      - `description` (text)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `metadata` (jsonb for additional data like old_stage, new_stage for status changes)
      
  3. Security
    - Enable RLS on `lead_activities` table
    - Add policies for company members to manage activities
    - Update leads policies to include new fields
*/

-- Add pipeline stage enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_stage') THEN
    CREATE TYPE pipeline_stage AS ENUM (
      'new_lead',
      'contacted',
      'quote_sent',
      'measurement_scheduled',
      'installation_scheduled',
      'completed',
      'lost'
    );
  END IF;
END $$;

-- Add new columns to leads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'pipeline_stage'
  ) THEN
    ALTER TABLE leads ADD COLUMN pipeline_stage pipeline_stage DEFAULT 'new_lead' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'project_details'
  ) THEN
    ALTER TABLE leads ADD COLUMN project_details jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lead_value'
  ) THEN
    ALTER TABLE leads ADD COLUMN lead_value numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'expected_close_date'
  ) THEN
    ALTER TABLE leads ADD COLUMN expected_close_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE leads ADD COLUMN lost_reason text;
  END IF;
END $$;

-- Create lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_company_id ON lead_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads(pipeline_stage);

-- Enable RLS
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_activities
CREATE POLICY "Company members can view their lead activities"
  ON lead_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = lead_activities.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can create lead activities"
  ON lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = lead_activities.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can update their lead activities"
  ON lead_activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = lead_activities.company_id
      AND company_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = lead_activities.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can delete their lead activities"
  ON lead_activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = lead_activities.company_id
      AND company_members.user_id = auth.uid()
    )
  );