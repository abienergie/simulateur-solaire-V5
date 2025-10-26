/*
  # Add resale tariffs to subsidies table

  1. Changes
    - Add `tarif_revente_totale` column (numeric) for total resale tariff in €/kWh
    - Add `tarif_revente_surplus` column (numeric) for surplus resale tariff in €/kWh
    
  2. Description
    These columns will store the EDF buyback rates for solar energy:
    - Total resale: when all produced energy is sold to the grid
    - Surplus resale: when only excess energy (not self-consumed) is sold to the grid
    
  3. Notes
    - Values are in €/kWh (e.g., 0.1430 for 14.30 c€/kWh)
    - These rates vary by power range and are set by the government
    - Default values will need to be populated after column creation
*/

-- Add tarif_revente_totale column
ALTER TABLE subsidies 
ADD COLUMN IF NOT EXISTS tarif_revente_totale NUMERIC(6,4) DEFAULT 0;

-- Add tarif_revente_surplus column
ALTER TABLE subsidies 
ADD COLUMN IF NOT EXISTS tarif_revente_surplus NUMERIC(6,4) DEFAULT 0;

COMMENT ON COLUMN subsidies.tarif_revente_totale IS 'EDF buyback rate for total resale in €/kWh';
COMMENT ON COLUMN subsidies.tarif_revente_surplus IS 'EDF buyback rate for surplus resale in €/kWh';
