/*
  # Add Subscription Management Tables

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `company_id` (uuid, references companies)
      - `stripe_customer_id` (text, unique)
      - `stripe_subscription_id` (text, unique)
      - `stripe_price_id` (text)
      - `status` (text) - active, canceled, past_due, incomplete, trialing
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `trial_end` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `payment_history`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references subscriptions)
      - `stripe_payment_intent_id` (text)
      - `amount` (integer) - amount in cents
      - `currency` (text)
      - `status` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to read their own subscription data
    - Add policies for company members to view company subscription
    - Add policies for authenticated users to view their payment history
    
  3. Indexes
    - Add indexes on foreign keys and lookup fields for performance
    
  4. Important Notes
    - Subscriptions are linked to both users and companies for flexibility
    - Payment history tracks all transactions for audit purposes
    - Status values match Stripe subscription statuses for consistency
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Company members can view company subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id IN (
        SELECT id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Payment history policies
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions
      WHERE user_id = auth.uid()
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
      WHERE p.id = auth.uid()
    )
  );

-- Add updated_at trigger for subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();