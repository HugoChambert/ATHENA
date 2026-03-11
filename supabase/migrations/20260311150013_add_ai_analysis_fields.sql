/*
  # Add AI Analysis Fields to Calls

  1. Changes to calls table
    - Add `ai_name` (text, extracted customer name)
    - Add `ai_email` (text, extracted email)
    - Add `ai_address` (text, extracted address)
    - Add `ai_project_type` (text, type of project)
    - Add `ai_materials` (text, materials mentioned)
    - Add `ai_timeline` (text, customer timeline)
    - Add `ai_budget` (text, budget mentioned)
    - Add `ai_processed` (boolean, whether AI analysis is complete)
    - Add `ai_processed_at` (timestamp, when analysis completed)

  2. Notes
    - transcript and summary fields already exist
    - sentiment field already exists
    - These fields store AI-extracted data for automatic lead creation
*/

-- Add AI analysis fields to calls table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_name'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_email'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_address'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_project_type'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_project_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_materials'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_materials text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_timeline'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_timeline text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_budget'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_budget text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_processed'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_processed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ai_processed_at'
  ) THEN
    ALTER TABLE calls ADD COLUMN ai_processed_at timestamptz;
  END IF;
END $$;

-- Create index for finding unprocessed calls
CREATE INDEX IF NOT EXISTS idx_calls_ai_processed ON calls(ai_processed) WHERE ai_processed = false;
