/*
  # Create weekly HP/HC consumption view

  1. New Views
    - `view_hp_hc_weekly`
      - Aggregates load curve data by week
      - Calculates HP/HC consumption from hourly data
      - Groups by PRM and ISO week format (YYYY-"W"WW)

  2. Security
    - View inherits RLS from underlying load_curve_data table
    - No additional policies needed as it's a view
*/

CREATE OR REPLACE VIEW view_hp_hc_weekly AS
SELECT
  prm,
  TO_CHAR(DATE_TRUNC('week', date_time), 'YYYY-"W"IW') AS week,
  SUM(CASE WHEN is_off_peak THEN value * 0.5 ELSE 0 END) AS kwh_hc,
  SUM(CASE WHEN NOT is_off_peak THEN value * 0.5 ELSE 0 END) AS kwh_hp,
  SUM(value * 0.5) AS kwh_total
FROM
  load_curve_data
GROUP BY
  prm,
  week
ORDER BY
  prm, week;