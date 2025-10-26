/*
  # Create subscription prices table

  1. New Tables
    - `subscription_prices`
      - `id` (uuid, primary key)
      - `power_kwc` (numeric, not null) - Puissance en kWc
      - `duration_25_years` (numeric, not null) - Mensualité TTC pour 25 ans
      - `duration_20_years` (numeric, not null) - Mensualité TTC pour 20 ans
      - `duration_15_years` (numeric, not null) - Mensualité TTC pour 15 ans
      - `duration_10_years` (numeric, not null) - Mensualité TTC pour 10 ans
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `subscription_prices` table
    - Add policy for public read access
    - Add policy for service role to manage data

  3. Initial Data
    - Insert current subscription prices for all power levels
*/

CREATE TABLE IF NOT EXISTS subscription_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  power_kwc numeric NOT NULL UNIQUE,
  duration_25_years numeric NOT NULL,
  duration_20_years numeric NOT NULL,
  duration_15_years numeric NOT NULL,
  duration_10_years numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_prices ENABLE ROW LEVEL SECURITY;

-- Create policy for reading subscription prices
CREATE POLICY "Anyone can read subscription prices" 
  ON subscription_prices
  FOR SELECT 
  TO PUBLIC
  USING (true);

-- Create policy for service role to manage subscription prices
CREATE POLICY "Service role can manage subscription prices"
  ON subscription_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to manage subscription prices
CREATE POLICY "Authenticated users can manage subscription prices"
  ON subscription_prices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert initial subscription prices data
INSERT INTO subscription_prices (power_kwc, duration_25_years, duration_20_years, duration_15_years, duration_10_years) VALUES
  (2.5, 49.00, 51.60, 56.40, 67.20),
  (3.0, 59.00, 63.60, 73.20, 86.40),
  (3.5, 68.50, 72.00, 80.40, 97.20),
  (4.0, 78.00, 82.80, 91.20, 106.80),
  (4.5, 87.00, 92.00, 102.00, 120.00),
  (5.0, 96.00, 100.80, 111.60, 134.40),
  (5.5, 105.50, 111.60, 122.40, 144.00),
  (6.0, 115.00, 120.00, 130.80, 153.60),
  (6.5, 124.00, 129.60, 142.80, 165.60),
  (7.0, 132.00, 138.00, 150.00, 174.00),
  (7.5, 140.00, 146.40, 159.60, 178.80),
  (8.0, 149.00, 156.00, 169.20, 192.00),
  (8.5, 158.00, 164.40, 177.60, 200.40),
  (9.0, 167.00, 174.00, 189.60, 206.40);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_subscription_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_prices_updated_at_trigger
  BEFORE UPDATE ON subscription_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_prices_updated_at();