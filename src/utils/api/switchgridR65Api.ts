/**
 * API helper for R65 (Consumption Data) via Switchgrid
 *
 * This utility provides a simple interface to fetch R65 consumption data
 * using the dedicated Supabase Edge Function 'switchgrid_r65_soutirage'
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface R65OrderRequest {
  prm: string;
  consent_id: string;
  start_date?: string;
  end_date?: string;
  returnRows?: boolean; // Si true, renvoie directement les rows parsées
}

interface R65EnergyByCadran {
  [key: string]: number; // BASE, HP, HC, etc.
}

interface R65Row {
  date: string;
  energy_total_kwh: number;
  energy_by_cadran?: R65EnergyByCadran;
}

interface R65OrderResponse {
  success?: boolean;
  rows?: R65Row[];
  dataUrl?: string;
  count?: number;
  error?: string;
}

/**
 * Create a R65 order and retrieve consumption data
 *
 * Option 1 (Recommandé): Obtenir directement les rows parsées
 * Option 2: Obtenir le dataUrl puis le fetch séparément
 *
 * @param request - Contains PRM, consent_id, date range, and returnRows flag
 * @returns R65 consumption data with rows (if returnRows=true) or dataUrl
 *
 * @example Option 1 - Direct (simple et rapide)
 * const result = await createR65Order({
 *   prm: "14862373311505",
 *   consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
 *   start_date: "2025-01-01",
 *   end_date: "2025-10-10",
 *   returnRows: true  // ← Renvoie directement { count, rows }
 * });
 *
 * @example Option 2 - Deux étapes (si besoin du dataUrl)
 * const order = await createR65Order({
 *   prm: "14862373311505",
 *   consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
 *   start_date: "2025-01-01",
 *   end_date: "2025-10-10",
 *   returnRows: false // ← Renvoie { dataUrl }
 * });
 * const data = await fetchR65DataFromUrl(order.dataUrl, true);
 */
export async function createR65Order(request: R65OrderRequest): Promise<R65OrderResponse> {
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }

  if (!request.prm) {
    throw new Error('PRM is required');
  }

  if (!request.consent_id) {
    throw new Error('consent_id is required');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/switchgrid-r65`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      action: 'create_r65_order_and_poll',
      prm: request.prm,
      consent_id: request.consent_id,
      start_date: request.start_date,
      end_date: request.end_date,
      returnRows: request.returnRows !== false // Par défaut true
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data: R65OrderResponse = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * @deprecated Use createR65Order instead
 */
export async function createR65YearOrder(request: R65OrderRequest): Promise<R65OrderResponse> {
  return createR65Order(request);
}

/**
 * Fetch data from dataUrl via proxy to avoid CORS issues
 *
 * @param dataUrl - The Google Storage URL returned by Switchgrid
 * @param parse - If true, returns parsed rows ready to use. If false, returns raw data.
 * @returns Parsed consumption data with rows
 *
 * @example
 * const data = await fetchR65DataFromUrl(
 *   "https://storage.googleapis.com/...",
 *   true  // ← Parse et renvoie { count, rows }
 * );
 */
export async function fetchR65DataFromUrl(dataUrl: string, parse: boolean = true): Promise<R65OrderResponse> {
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/switchgrid-r65`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      action: 'fetch_data_url',
      dataUrl: dataUrl,
      parse: parse
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data from proxy: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Format consumption statistics for display
 */
export function formatR65Stats(response: R65OrderResponse) {
  const count = response.count || response.rows?.length || 0;
  return {
    dataPoints: count,
    hasRows: !!response.rows && response.rows.length > 0,
    hasDataUrl: !!response.dataUrl,
    success: count > 0 || !!response.dataUrl
  };
}
