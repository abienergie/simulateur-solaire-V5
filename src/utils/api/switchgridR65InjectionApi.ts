/**
 * API helper for R65 INJECTION (Production Data) via Switchgrid
 *
 * This utility provides a simple interface to fetch R65 injection data
 * (energy injected into the grid from solar panels)
 * using the dedicated Supabase Edge Function 'switchgrid-r65-injection'
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface R65InjectionOrderRequest {
  prm: string;
  consent_id: string;
  start_date?: string;
  end_date?: string;
  returnRows?: boolean;
}

interface R65InjectionRow {
  date: string;
  energy_total_kwh: number;
  energy_by_cadran?: { INJECTION: number };
}

interface R65InjectionOrderResponse {
  success?: boolean;
  rows?: R65InjectionRow[];
  dataUrl?: string;
  count?: number;
  error?: string;
}

/**
 * Create a R65 INJECTION order and retrieve production data
 *
 * @param request - Contains PRM, consent_id, date range
 * @returns R65 injection data with rows
 *
 * @example
 * const result = await createR65InjectionOrder({
 *   prm: "14862373311505",
 *   consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
 *   start_date: "2024-01-01",
 *   end_date: "2024-12-31",
 *   returnRows: true
 * });
 *
 * console.log(`Received ${result.count} days of injection data`);
 * console.log(`Total injected: ${result.rows.reduce((sum, r) => sum + r.energy_total_kwh, 0)} kWh`);
 */
export async function createR65InjectionOrder(
  request: R65InjectionOrderRequest
): Promise<R65InjectionOrderResponse> {
  const functionUrl = `${SUPABASE_URL}/functions/v1/switchgrid-r65-injection`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'create_r65_injection_order_and_poll',
      prm: request.prm,
      consent_id: request.consent_id,
      start_date: request.start_date,
      end_date: request.end_date,
      returnRows: request.returnRows !== false
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`R65 INJECTION order failed: ${errorData.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Format R65 INJECTION stats for display
 */
export function formatR65InjectionStats(response: R65InjectionOrderResponse): string {
  if (!response.success || !response.rows) {
    return 'No injection data available';
  }

  const totalInjected = response.rows.reduce((sum, row) => sum + row.energy_total_kwh, 0);
  const avgDaily = totalInjected / response.rows.length;

  return `${response.count} days • ${Math.round(totalInjected)} kWh total • ${Math.round(avgDaily)} kWh/day avg`;
}
