/**
 * API helper for C68 (Contract Details) via Switchgrid
 *
 * This utility provides a simple interface to fetch C68 contract details
 * using the dedicated Supabase Edge Function 'switchgrid_c68'
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface C68OrderRequest {
  prm: string;
  consent_id: string;
}

interface C68OrderResponse {
  success?: boolean;
  orderId?: string;
  requestId?: string;
  c68?: any;
  tariffInfo?: any;
  c68Data?: any;
  error?: string;
}

/**
 * Create a C68 order and retrieve contract details
 *
 * @param request - Contains PRM and consent_id
 * @returns C68 contract data with tariffInfo and c68Data
 *
 * @example
 * const result = await createC68Order({
 *   prm: "14862373311505",
 *   consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d"
 * });
 */
export async function createC68Order(request: C68OrderRequest): Promise<C68OrderResponse> {
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }

  if (!request.prm) {
    throw new Error('PRM is required');
  }

  if (!request.consent_id) {
    throw new Error('consent_id is required');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/switchgrid-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'create_order_c68',
      prm: request.prm,
      consentId: request.consent_id
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data: C68OrderResponse = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  // Normaliser la structure de la réponse
  return {
    ...data,
    c68Data: data.c68 || data.c68Data,
    success: true
  };
}

/**
 * Extract useful contract information from C68 response
 */
export function parseC68ContractData(response: C68OrderResponse) {
  const c68 = response.c68Data || {};
  const tariff = response.tariffInfo || {};

  return {
    prm: c68?.point_id || c68?.prm,
    puissanceSouscrite: c68?.puissance_souscrite || c68?.subscribed_power,
    formuleTarifaire: c68?.formule_tarifaire_acheminement || c68?.formula_code,
    typeCompteur: c68?.type_compteur || c68?.meter_type,
    calendrierDistributeur: c68?.calendrier_distributeur,
    dateDebutContrat: c68?.date_debut_contrat || c68?.contract_start_date,
    etatContractuel: c68?.etat_contractuel || c68?.contractual_state,
    segmentClientFinal: c68?.segment_client_final,
    tariffInfo: tariff,
    c68Data: c68,
    raw: response
  };
}
