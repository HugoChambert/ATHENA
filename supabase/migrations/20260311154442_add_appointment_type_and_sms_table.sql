/*
  # Add Appointment Type and SMS Messages Table

  1. Changes to appointments table
    - Add `appointment_type` column (estimate, measurement, installation)
    - Add `duration_minutes` column
    - Add `notes` column
    - Add `created_by` column
    - Add `updated_at` column
    
  2. New Tables
    - `sms_messages`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `lead_id` (uuid, foreign key to leads, nullable)
      - `call_id` (uuid, foreign key to calls, nullable)
      - `message_sid` (text, unique)
      - `from_number` (text)
      - `to_number` (text)
      - `body` (text)
      - `direction` (text: inbound, outbound)
      - `status` (text)
      - `created_at` (timestamptz)
      
  3. Security
    - Enable RLS on sms_messages table
    - Add policies for company members to manage their SMS data
*/

-- Add new columns to appointments table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'appointment_type'
  ) THEN
    ALTER TABLE appointments ADD COLUMN appointment_type text CHECK (appointment_type IN ('estimate', 'measurement', 'installation'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE appointments ADD COLUMN duration_minutes integer DEFAULT 60;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE appointments ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE appointments ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create SMS messages table
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
  message_sid text UNIQUE,
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(appointment_type);
CREATE INDEX IF NOT EXISTS idx_sms_messages_company_id ON sms_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_lead_id ON sms_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_call_id ON sms_messages(call_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);

-- Enable RLS
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_messages
CREATE POLICY "Company members can view their SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = sms_messages.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can create SMS messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = sms_messages.company_id
      AND company_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can update their SMS messages"
  ON sms_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = sms_messages.company_id
      AND company_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = sms_messages.company_id
      AND company_members.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on appointments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointments_updated_at') THEN
    DROP TRIGGER update_appointments_updated_at ON appointments;
  END IF;
END $$;

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();