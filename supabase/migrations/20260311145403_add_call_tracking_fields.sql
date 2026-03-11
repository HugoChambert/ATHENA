/*
  # Add Call Tracking Fields

  1. Changes to calls table
    - Add `call_sid` (text, Twilio call identifier)
    - Add `recording_sid` (text, Twilio recording identifier)
    - Remove user_id (no longer needed with company model)

  2. Add indexes
    - Index on call_sid for quick lookups
    - Index on company_id and call_date for dashboard queries
*/

-- Add new fields to calls table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'call_sid'
  ) THEN
    ALTER TABLE calls ADD COLUMN call_sid text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'recording_sid'
  ) THEN
    ALTER TABLE calls ADD COLUMN recording_sid text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_call_sid ON calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_company_call_date ON calls(company_id, call_date DESC);
CREATE INDEX IF NOT EXISTS idx_calls_company_status ON calls(company_id, status);
