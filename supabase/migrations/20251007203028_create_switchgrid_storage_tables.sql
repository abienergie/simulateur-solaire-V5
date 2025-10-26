/*
  # Création des tables de stockage Switchgrid

  ## Vue d'ensemble
  Ce migration crée 8 tables pour stocker les données récupérées depuis Switchgrid via leur API.

  ## Nouvelles tables

  ### 1. switchgrid_orders - Historique des commandes Switchgrid
  ### 2. switchgrid_contract_details - Informations contractuelles (C68)
  ### 3. switchgrid_consumption_daily - Consommation quotidienne (R65)
  ### 4. switchgrid_max_power - Puissances maximales soutirées (R66)
  ### 5. switchgrid_load_curve - Courbe de charge consommation (LOADCURVE)
  ### 6. switchgrid_production_daily - Production PV quotidienne (INJECTION)
  ### 7. switchgrid_production_max_power - Puissances maximales injectées
  ### 8. switchgrid_production_load_curve - Courbe de production PV

  ## Sécurité
  - RLS activé sur toutes les tables
  - Politiques restrictives par défaut
*/

-- TABLE 1: switchgrid_orders
CREATE TABLE IF NOT EXISTS switchgrid_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdl text NOT NULL,
  order_id text NOT NULL,
  ask_id text,
  consent_id text,
  status text NOT NULL,
  requests jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_switchgrid_orders_user_pdl
  ON switchgrid_orders(user_id, pdl, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_switchgrid_orders_order_id
  ON switchgrid_orders(order_id);

ALTER TABLE switchgrid_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON switchgrid_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON switchgrid_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON switchgrid_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TABLE 2: switchgrid_contract_details
CREATE TABLE IF NOT EXISTS switchgrid_contract_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdl text NOT NULL,
  contract_data jsonb NOT NULL,
  tariff_type text,
  tariff_structure jsonb,
  formula_code text,
  source_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pdl, user_id)
);

CREATE INDEX IF NOT EXISTS idx_switchgrid_contract_pdl
  ON switchgrid_contract_details(pdl);

CREATE INDEX IF NOT EXISTS idx_switchgrid_contract_user
  ON switchgrid_contract_details(user_id);

ALTER TABLE switchgrid_contract_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contracts"
  ON switchgrid_contract_details FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts"
  ON switchgrid_contract_details FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts"
  ON switchgrid_contract_details FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TABLE 3: switchgrid_consumption_daily
CREATE TABLE IF NOT EXISTS switchgrid_consumption_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdl text NOT NULL,
  date date NOT NULL,
  energy_total_kwh numeric NOT NULL DEFAULT 0,
  energy_by_cadran jsonb,
  source_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pdl, date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_switchgrid_consumption_pdl_date
  ON switchgrid_consumption_daily(pdl, date DESC);

CREATE INDEX IF NOT EXISTS idx_switchgrid_consumption_user
  ON switchgrid_consumption_daily(user_id);

ALTER TABLE switchgrid_consumption_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consumption"
  ON switchgrid_consumption_daily FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consumption"
  ON switchgrid_consumption_daily FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consumption"
  ON switchgrid_consumption_daily FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TABLE 4: switchgrid_max_power
CREATE TABLE IF NOT EXISTS switchgrid_max_power (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdl text NOT NULL,
  date date NOT NULL,
  max_power_kw numeric NOT NULL DEFAULT 0,
  max_power_by_cadran jsonb,
  source_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pdl, date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_switchgrid_max_power_pdl_date
  ON switchgrid_max_power(pdl, date DESC);

CREATE INDEX IF NOT EXISTS idx_switchgrid_max_power_user
  ON switchgrid_max_power(user_id);

ALTER TABLE switchgrid_max_power ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own max power"
  ON switchgrid_max_power FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own max power"
  ON switchgrid_max_power FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own max power"
  ON switchgrid_max_power FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TABLE 5: switchgrid_load_curve
CREATE TABLE IF NOT EXISTS switchgrid_load_curve (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdl text NOT NULL,
  timestamp timestamptz NOT NULL,
  power_kw numeric NOT NULL DEFAULT 0,
  interval_duration text,
  source_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pdl, timestamp, user_id)
);

CREATE INDEX IF NOT EXISTS idx_switchgrid_load_curve_pdl_timestamp
  ON switchgrid_load_curve(pdl, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_switchgrid_load_curve_user
  ON switchgrid_load_curve(user_id);

ALTER TABLE switchgrid_load_curve ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own load curve"
  ON switchgrid_load_curve FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own load curve"
  ON switchgrid_load_curve FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own load curve"
  ON switchgrid_load_curve FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TABLE 6: switchgrid_production_daily
CREATE TABLE IF NOT EXISTS switchgrid_production_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdl text NOT NULL,
  date date NOT NULL,
  energy_total_kwh numeric NOT NULL DEFAULT 0,
  energy_by_cadran jsonb,
  source_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pdl, date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_switchgrid_production_pdl_date
  ON switchgrid_production_daily(pdl, date DESC);

CREATE INDEX IF NOT EXISTS idx_switchgrid_production_user
  ON switchgrid_production_daily(user_id);

ALTER TABLE switchgrid_production_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own production"
  ON switchgrid_production_daily FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own production"
  ON switchgrid_production_daily FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own production"
  ON switchgrid_production_daily FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TABLE 7: switchgrid_production_max_power
CREATE TABLE IF NOT EXISTS switchgrid_production_max_power (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdl text NOT NULL,
  date date NOT NULL,
  max_power_kw numeric NOT NULL DEFAULT 0,
  source_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pdl, date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_switchgrid_production_max_pdl_date
  ON switchgrid_production_max_power(pdl, date DESC);

CREATE INDEX IF NOT EXISTS idx_switchgrid_production_max_user
  ON switchgrid_production_max_power(user_id);

ALTER TABLE switchgrid_production_max_power ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own production max power"
  ON switchgrid_production_max_power FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own production max power"
  ON switchgrid_production_max_power FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own production max power"
  ON switchgrid_production_max_power FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TABLE 8: switchgrid_production_load_curve
CREATE TABLE IF NOT EXISTS switchgrid_production_load_curve (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdl text NOT NULL,
  timestamp timestamptz NOT NULL,
  power_kw numeric NOT NULL DEFAULT 0,
  interval_duration text,
  source_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pdl, timestamp, user_id)
);

CREATE INDEX IF NOT EXISTS idx_switchgrid_production_curve_pdl_timestamp
  ON switchgrid_production_load_curve(pdl, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_switchgrid_production_curve_user
  ON switchgrid_production_load_curve(user_id);

ALTER TABLE switchgrid_production_load_curve ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own production load curve"
  ON switchgrid_production_load_curve FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own production load curve"
  ON switchgrid_production_load_curve FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own production load curve"
  ON switchgrid_production_load_curve FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);