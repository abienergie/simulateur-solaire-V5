/**
 * API helper for R66 (Max Power Data) via Switchgrid
 *
 * This utility provides a simple interface to fetch R66 maximum power data
 * using the dedicated Supabase Edge Function 'switchgrid-r66'
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface R66OrderRequest {
  prm: string;
  consent_id: string;
  start_date?: string;
  end_date?: string;
  returnRows?: boolean;
}

interface R66Row {
  date: string;
  power_max_kw: number;
  time_of_max?: string | null;
}

interface R66OrderResponse {
  success?: boolean;
  rows?: R66Row[];
  dataUrl?: string;
  count?: number;
  error?: string;
}

/**
 * Create a R66 order and retrieve maximum power data
 *
 * @param request - Contains PRM, consent_id, date range
 * @returns R66 max power data with rows
 *
 * @example
 * const result = await createR66Order({
 *   prm: "14862373311505",
 *   consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
 *   start_date: "2024-01-01",
 *   end_date: "2024-12-31",
 *   returnRows: true
 * });
 *
 * console.log(`Received ${result.count} days of max power data`);
 * const maxPower = Math.max(...result.rows.map(r => r.power_max_kw));
 * console.log(`Peak power: ${maxPower} kW`);
 */
export async function createR66Order(
  request: R66OrderRequest
): Promise<R66OrderResponse> {
  const functionUrl = `${SUPABASE_URL}/functions/v1/switchgrid-r66`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'create_r66_order_and_poll',
      prm: request.prm,
      consent_id: request.consent_id,
      start_date: request.start_date,
      end_date: request.end_date,
      returnRows: request.returnRows !== false
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`R66 order failed: ${errorData.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Format R66 stats for display
 */
export function formatR66Stats(response: R66OrderResponse): string {
  if (!response.success || !response.rows) {
    return 'No max power data available';
  }

  const maxPower = Math.max(...response.rows.map(r => r.power_max_kw));
  const avgPower = response.rows.reduce((sum, r) => sum + r.power_max_kw, 0) / response.rows.length;

  return `${response.count} days • Peak: ${Math.round(maxPower * 10) / 10} kW • Avg: ${Math.round(avgPower * 10) / 10} kW`;
}

/**
 * Find the day with maximum power
 */
export function findMaxPowerDay(rows: R66Row[]): R66Row | null {
  if (!rows || rows.length === 0) return null;

  return rows.reduce((max, row) =>
    row.power_max_kw > max.power_max_kw ? row : max
  , rows[0]);
}
