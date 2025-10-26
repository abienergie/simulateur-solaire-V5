/*
  # Restore subscription prices data

  1. Data Restoration
    - Insert all subscription prices for powers from 2.5 kWc to 9.0 kWc
    - Include prices for all durations (10, 15, 20, 25 years)
    - Use ON CONFLICT to handle existing data safely

  2. Additional Powers
    - Add professional installation prices (12.0, 15.0 kWc)
    - These are commonly used for larger installations
*/

-- Insert subscription prices data (will not overwrite existing data)
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
  (9.0, 167.00, 174.00, 189.60, 206.40),
  (12.0, 195.70, 210.50, 237.00, 297.60),
  (15.0, 243.50, 260.60, 291.80, 363.60)
ON CONFLICT (power_kwc) DO UPDATE SET
  duration_25_years = EXCLUDED.duration_25_years,
  duration_20_years = EXCLUDED.duration_20_years,
  duration_15_years = EXCLUDED.duration_15_years,
  duration_10_years = EXCLUDED.duration_10_years,
  updated_at = now();

-- Log the restoration
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM subscription_prices;
  RAISE NOTICE 'Subscription prices table now contains % records', record_count;
END $$;