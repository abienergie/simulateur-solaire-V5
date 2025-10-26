/*
  # Table pour sauvegarder les compteurs (PDL) et leurs consentements

  1. Nouvelle table
    - `saved_meters`
      - `id` (uuid, primary key)
      - `prm` (text, unique) - Point de Référence Mesure (identifiant compteur)
      - `ask_id` (text) - ID de la demande de consentement
      - `contract_id` (text) - ID du contrat
      - `consent_id` (text) - ID du consentement
      - `label` (text, nullable) - Libellé personnalisé (ex: "Maison principale")
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_used_at` (timestamp, nullable) - Dernière utilisation

  2. Sécurité
    - Enable RLS sur `saved_meters`
    - Policy pour permettre la lecture/écriture sans authentification (public)

  3. Index
    - Index sur `prm` pour recherche rapide
    - Index sur `last_used_at` pour tri par utilisation récente
*/

-- Create saved_meters table
CREATE TABLE IF NOT EXISTS saved_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prm text UNIQUE NOT NULL,
  ask_id text NOT NULL,
  contract_id text NOT NULL,
  consent_id text NOT NULL,
  label text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  last_used_at timestamptz
);

-- Enable RLS
ALTER TABLE saved_meters ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for demo purposes)
CREATE POLICY "Allow public read access to saved_meters"
  ON saved_meters
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access to saved_meters"
  ON saved_meters
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access to saved_meters"
  ON saved_meters
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to saved_meters"
  ON saved_meters
  FOR DELETE
  TO anon
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_meters_prm ON saved_meters(prm);
CREATE INDEX IF NOT EXISTS idx_saved_meters_last_used ON saved_meters(last_used_at DESC);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_saved_meters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_saved_meters_updated_at ON saved_meters;
CREATE TRIGGER trigger_update_saved_meters_updated_at
  BEFORE UPDATE ON saved_meters
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_meters_updated_at();
