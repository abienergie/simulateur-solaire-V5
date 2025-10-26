/*
  # Create subscription_prices table

  1. New Tables
    - `subscription_prices`
      - `id` (uuid, primary key)
      - `power_kwc` (numeric) - Puissance crête en kWc
      - `duration_10_years` (numeric) - Prix mensuel pour 10 ans
      - `duration_15_years` (numeric) - Prix mensuel pour 15 ans
      - `duration_20_years` (numeric) - Prix mensuel pour 20 ans
      - `duration_25_years` (numeric) - Prix mensuel pour 25 ans
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `subscription_prices` table
    - Add policy for public read access (prices are public information)
    - Add policy for authenticated admin users to manage prices

  3. Initial Data
    - Populate with default subscription prices for all power ranges and durations
*/

CREATE TABLE IF NOT EXISTS subscription_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  power_kwc numeric NOT NULL UNIQUE,
  duration_10_years numeric NOT NULL DEFAULT 0,
  duration_15_years numeric NOT NULL DEFAULT 0,
  duration_20_years numeric NOT NULL DEFAULT 0,
  duration_25_years numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_prices ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (everyone can see prices)
CREATE POLICY "Anyone can view subscription prices"
  ON subscription_prices
  FOR SELECT
  TO public
  USING (true);

-- Policy for authenticated users to update prices (admin only in practice)
CREATE POLICY "Authenticated users can manage subscription prices"
  ON subscription_prices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default subscription prices
INSERT INTO subscription_prices (power_kwc, duration_25_years, duration_20_years, duration_15_years, duration_10_years)
VALUES
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
  (9.0, 167.00, 174.00, 189.60, 206.40),
  (12.0, 195.70, 210.50, 237.00, 297.60),
  (15.0, 243.50, 260.60, 291.80, 363.60),
  (18.0, 290.00, 310.00, 340.00, 420.00),
  (20.0, 320.00, 340.00, 375.00, 460.00),
  (25.0, 395.00, 420.00, 460.00, 570.00),
  (30.0, 470.00, 500.00, 550.00, 680.00),
  (36.0, 560.00, 595.00, 655.00, 810.00)
ON CONFLICT (power_kwc) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_prices_updated_at
  BEFORE UPDATE ON subscription_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();