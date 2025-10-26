/*
  # Création des tables de stockage Switchgrid

  ## Vue d'ensemble
  Ce migration crée 8 tables pour stocker les données récupérées depuis Switchgrid via leur API.
  Ces tables permettent de sauvegarder localement les données de consommation, production et contrat
  pour éviter de redemander constamment à l'API et pour permettre l'analyse historique.

  ## Nouvelles tables

  ### 1. switchgrid_orders
  Trace les commandes passées à l'API Switchgrid pour récupérer les données.
  - Conserve l'historique des récupérations
  - Permet de suivre le statut des requêtes
  - Liaison avec l'utilisateur qui a fait la demande

  ### 2. switchgrid_contract_details
  Stocke les informations contractuelles (C68) d'un PDL.
  - Données brutes du contrat
  - Type de tarif détecté (BASE, HP/HC, TEMPO, etc.)
  - Structure des cadrans tarifaires pour l'affichage

  ### 3. switchgrid_consumption_daily
  Consommation quotidienne d'électricité (R65).
  - Total par jour
  - Détail par cadran tarifaire (HP/HC, TEMPO, etc.) en JSONB
  - Permet l'analyse de la consommation sur 12 mois

  ### 4. switchgrid_max_power
  Puissances maximales soutirées (R66).
  - Puissance de crête par jour
  - Détail par cadran si applicable
  - Utile pour dimensionner l'installation

  ### 5. switchgrid_load_curve
  Courbe de charge détaillée au pas 10min/30min (LOADCURVE).
  - Puissance instantanée consommée
  - Permet d'analyser les patterns de consommation
  - Volume important (jusqu'à 4320 points/mois)

  ### 6. switchgrid_production_daily
  Production photovoltaïque quotidienne (INJECTION).
  - Total injecté par jour
  - Détail par cadran si applicable
  - Permet de calculer l'autoconsommation

  ### 7. switchgrid_production_max_power
  Puissances maximales injectées.
  - Puissance de crête production par jour
  - Valide le dimensionnement de l'onduleur

  ### 8. switchgrid_production_load_curve
  Courbe de production détaillée.
  - Production instantanée au pas 10min/30min
  - Permet de calculer l'autoconsommation instantanée

  ## Sécurité
  - RLS activé sur toutes les tables
  - Les utilisateurs ne peuvent voir que leurs propres données
  - Politiques restrictives par défaut

  ## Performance
  - Index sur (pdl, date) pour requêtes rapides
  - UNIQUE constraints pour éviter les doublons
  - JSONB pour flexibilité des cadrans tarifaires
*/

-- =====================================================
-- TABLE 1: switchgrid_orders
-- Historique des commandes Switchgrid
-- =====================================================
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

-- =====================================================
-- TABLE 2: switchgrid_contract_details
-- Informations contractuelles (C68)
-- =====================================================
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

-- =====================================================
-- TABLE 3: switchgrid_consumption_daily
-- Consommation quotidienne (R65)
-- =====================================================
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

-- =====================================================
-- TABLE 4: switchgrid_max_power
-- Puissances maximales soutirées (R66)
-- =====================================================
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

-- =====================================================
-- TABLE 5: switchgrid_load_curve
-- Courbe de charge consommation (LOADCURVE)
-- =====================================================
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

-- =====================================================
-- TABLE 6: switchgrid_production_daily
-- Production PV quotidienne (INJECTION)
-- =====================================================
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

-- =====================================================
-- TABLE 7: switchgrid_production_max_power
-- Puissances maximales injectées
-- =====================================================
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

-- =====================================================
-- TABLE 8: switchgrid_production_load_curve
-- Courbe de production PV
-- =====================================================
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
