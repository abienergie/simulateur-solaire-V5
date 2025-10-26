/*
  # Add UNIQUE constraints for Switchgrid upserts

  1. Changes
    - Add unique index on switchgrid_consumption_daily(pdl, date, user_id)
    - Add unique index on switchgrid_max_power(pdl, date, user_id)  
    - Add unique index on switchgrid_load_curve(pdl, timestamp, user_id)
    
  2. Purpose
    - Enable onConflict parameter in upsert operations
    - Prevent duplicate entries for same PRM/date/user combination
    - Required for proper functioning of Switchgrid data insertion

  3. Notes
    - These constraints are essential for the upsert operations to work
    - Without them, onConflict parameter will fail silently
*/

-- Unique constraint for daily consumption data
CREATE UNIQUE INDEX IF NOT EXISTS ux_consumption_daily
  ON public.switchgrid_consumption_daily (pdl, date, user_id);

-- Unique constraint for max power data
CREATE UNIQUE INDEX IF NOT EXISTS ux_max_power
  ON public.switchgrid_max_power (pdl, date, user_id);

-- Unique constraint for load curve data
CREATE UNIQUE INDEX IF NOT EXISTS ux_load_curve
  ON public.switchgrid_load_curve (pdl, timestamp, user_id);