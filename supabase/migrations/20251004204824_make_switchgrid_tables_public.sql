/*
  # Rendre les tables Switchgrid publiques

  1. Modifications
    - Retirer les contraintes foreign key sur auth.users
    - Rendre les colonnes user_id nullables
    - Ajouter des policies publiques pour permettre l'accès sans authentification

  2. Sécurité
    - Les données Switchgrid sont accessibles à tous (données de consommation agrégées)
    - Pas de données personnelles sensibles
*/

-- =====================================================
-- Retirer les contraintes FK et rendre user_id nullable
-- =====================================================

-- switchgrid_contract_details
ALTER TABLE switchgrid_contract_details
  DROP CONSTRAINT IF EXISTS switchgrid_contract_details_user_id_fkey;

ALTER TABLE switchgrid_contract_details
  ALTER COLUMN user_id DROP NOT NULL;

-- switchgrid_consumption_daily
ALTER TABLE switchgrid_consumption_daily
  DROP CONSTRAINT IF EXISTS switchgrid_consumption_daily_user_id_fkey;

ALTER TABLE switchgrid_consumption_daily
  ALTER COLUMN user_id DROP NOT NULL;

-- switchgrid_max_power
ALTER TABLE switchgrid_max_power
  DROP CONSTRAINT IF EXISTS switchgrid_max_power_user_id_fkey;

ALTER TABLE switchgrid_max_power
  ALTER COLUMN user_id DROP NOT NULL;

-- switchgrid_load_curve
ALTER TABLE switchgrid_load_curve
  DROP CONSTRAINT IF EXISTS switchgrid_load_curve_user_id_fkey;

ALTER TABLE switchgrid_load_curve
  ALTER COLUMN user_id DROP NOT NULL;

-- switchgrid_production_daily
ALTER TABLE switchgrid_production_daily
  DROP CONSTRAINT IF EXISTS switchgrid_production_daily_user_id_fkey;

ALTER TABLE switchgrid_production_daily
  ALTER COLUMN user_id DROP NOT NULL;

-- switchgrid_production_max_power
ALTER TABLE switchgrid_production_max_power
  DROP CONSTRAINT IF EXISTS switchgrid_production_max_power_user_id_fkey;

ALTER TABLE switchgrid_production_max_power
  ALTER COLUMN user_id DROP NOT NULL;

-- switchgrid_production_load_curve
ALTER TABLE switchgrid_production_load_curve
  DROP CONSTRAINT IF EXISTS switchgrid_production_load_curve_user_id_fkey;

ALTER TABLE switchgrid_production_load_curve
  ALTER COLUMN user_id DROP NOT NULL;

-- switchgrid_orders
ALTER TABLE switchgrid_orders
  DROP CONSTRAINT IF EXISTS switchgrid_orders_user_id_fkey;

ALTER TABLE switchgrid_orders
  ALTER COLUMN user_id DROP NOT NULL;

-- =====================================================
-- Ajouter des policies publiques
-- =====================================================

-- switchgrid_contract_details
DROP POLICY IF EXISTS "Users can view own contracts" ON switchgrid_contract_details;
DROP POLICY IF EXISTS "Users can insert own contracts" ON switchgrid_contract_details;
DROP POLICY IF EXISTS "Users can update own contracts" ON switchgrid_contract_details;

CREATE POLICY "Public read access on contracts"
  ON switchgrid_contract_details FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert access on contracts"
  ON switchgrid_contract_details FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update access on contracts"
  ON switchgrid_contract_details FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- switchgrid_consumption_daily
DROP POLICY IF EXISTS "Users can view own consumption" ON switchgrid_consumption_daily;
DROP POLICY IF EXISTS "Users can insert own consumption" ON switchgrid_consumption_daily;
DROP POLICY IF EXISTS "Users can update own consumption" ON switchgrid_consumption_daily;

CREATE POLICY "Public read access on consumption"
  ON switchgrid_consumption_daily FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert access on consumption"
  ON switchgrid_consumption_daily FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update access on consumption"
  ON switchgrid_consumption_daily FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- switchgrid_max_power
DROP POLICY IF EXISTS "Users can view own max power" ON switchgrid_max_power;
DROP POLICY IF EXISTS "Users can insert own max power" ON switchgrid_max_power;
DROP POLICY IF EXISTS "Users can update own max power" ON switchgrid_max_power;

CREATE POLICY "Public read access on max power"
  ON switchgrid_max_power FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert access on max power"
  ON switchgrid_max_power FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update access on max power"
  ON switchgrid_max_power FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- switchgrid_load_curve
DROP POLICY IF EXISTS "Users can view own load curve" ON switchgrid_load_curve;
DROP POLICY IF EXISTS "Users can insert own load curve" ON switchgrid_load_curve;
DROP POLICY IF EXISTS "Users can update own load curve" ON switchgrid_load_curve;

CREATE POLICY "Public read access on load curve"
  ON switchgrid_load_curve FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert access on load curve"
  ON switchgrid_load_curve FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update access on load curve"
  ON switchgrid_load_curve FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- switchgrid_production_daily
DROP POLICY IF EXISTS "Users can view own production" ON switchgrid_production_daily;
DROP POLICY IF EXISTS "Users can insert own production" ON switchgrid_production_daily;
DROP POLICY IF EXISTS "Users can update own production" ON switchgrid_production_daily;

CREATE POLICY "Public read access on production"
  ON switchgrid_production_daily FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert access on production"
  ON switchgrid_production_daily FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update access on production"
  ON switchgrid_production_daily FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- switchgrid_production_max_power
DROP POLICY IF EXISTS "Users can view own production max power" ON switchgrid_production_max_power;
DROP POLICY IF EXISTS "Users can insert own production max power" ON switchgrid_production_max_power;
DROP POLICY IF EXISTS "Users can update own production max power" ON switchgrid_production_max_power;

CREATE POLICY "Public read access on production max power"
  ON switchgrid_production_max_power FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert access on production max power"
  ON switchgrid_production_max_power FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update access on production max power"
  ON switchgrid_production_max_power FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- switchgrid_production_load_curve
DROP POLICY IF EXISTS "Users can view own production load curve" ON switchgrid_production_load_curve;
DROP POLICY IF EXISTS "Users can insert own production load curve" ON switchgrid_production_load_curve;
DROP POLICY IF EXISTS "Users can update own production load curve" ON switchgrid_production_load_curve;

CREATE POLICY "Public read access on production load curve"
  ON switchgrid_production_load_curve FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert access on production load curve"
  ON switchgrid_production_load_curve FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update access on production load curve"
  ON switchgrid_production_load_curve FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- switchgrid_orders
DROP POLICY IF EXISTS "Users can view own orders" ON switchgrid_orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON switchgrid_orders;
DROP POLICY IF EXISTS "Users can update own orders" ON switchgrid_orders;

CREATE POLICY "Public read access on orders"
  ON switchgrid_orders FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public insert access on orders"
  ON switchgrid_orders FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public update access on orders"
  ON switchgrid_orders FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
