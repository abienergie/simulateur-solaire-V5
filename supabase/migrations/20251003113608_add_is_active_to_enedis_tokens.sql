/*
  # Add is_active column to enedis_tokens table

  1. Changes
    - Add `is_active` boolean column to enedis_tokens table with default value false
    - Add index on is_active column for better query performance
    
  2. Notes
    - This column is used by edge functions to track which token is currently active
    - Only one token should be active at a time
*/

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enedis_tokens' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE enedis_tokens ADD COLUMN is_active boolean DEFAULT false;
  END IF;
END $$;

-- Create index on is_active for better query performance
CREATE INDEX IF NOT EXISTS idx_enedis_tokens_is_active ON enedis_tokens(is_active) WHERE is_active = true;