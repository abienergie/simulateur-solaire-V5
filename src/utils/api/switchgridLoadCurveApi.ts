import { supabase } from '../../lib/supabase';

export interface LoadCurveDataPoint {
  datetime: string;
  power_kw: number;
}

export interface LoadCurveResponse {
  success: boolean;
  orderId: string;
  requestId: string;
  count: number;
  rows: LoadCurveDataPoint[];
  period: {
    start: string;
    end: string;
  };
}

export interface CreateOrderRequest {
  consentId: string;
  requests: {
    type: 'LOADCURVE';
    direction: 'CONSUMPTION' | 'INJECTION';
    usagePointId?: string;
    start?: string;
    end?: string;
  }[];
}

export interface OrderResponse {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'ERROR';
  requests: {
    id: string;
    type: string;
    status: string;
    dataUrl?: string;
  }[];
}

export interface LoadCurveData {
  timestamp: string;
  value: number;
  unit: string;
}

/**
 * Crée une commande LOADCURVE (courbe de charge en consommation)
 * et attend que les données soient disponibles
 * @param period - Pas de temps: '15min', '30min', '1h' (défaut: '30min')
 */
export async function createLoadCurveOrder(
  prm: string,
  consentId: string,
  startDate?: string,
  endDate?: string,
  period: string = '30min'
): Promise<LoadCurveResponse> {
  console.log('📞 Calling LOADCURVE Edge Function...');
  console.log(`📊 Period: ${period}`);

  const { data, error } = await supabase.functions.invoke('switchgrid-loadcurve', {
    body: {
      action: 'create_loadcurve_order_and_poll',
      prm,
      consent_id: consentId,
      start_date: startDate,
      end_date: endDate,
      period,
      returnRows: true
    }
  });

  if (error) {
    console.error('❌ LOADCURVE Edge Function error:', error);
    throw new Error(`Erreur lors de la récupération de la courbe de charge: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Échec de la récupération de la courbe de charge');
  }

  console.log(`✅ LOADCURVE data retrieved: ${data.count} points`);
  return data;
}

/**
 * Récupère les données brutes depuis une dataUrl
 */
export async function fetchLoadCurveDataFromUrl(
  dataUrl: string,
  parse: boolean = true
): Promise<any> {
  console.log('📥 Fetching LOADCURVE data from URL...');

  const { data, error } = await supabase.functions.invoke('switchgrid-loadcurve', {
    body: {
      action: 'fetch_data_url',
      dataUrl,
      parse
    }
  });

  if (error) {
    console.error('❌ Error fetching LOADCURVE data:', error);
    throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
  }

  return data;
}

// ============================================================================
// NOUVELLES FONCTIONS POUR LES 3 EDGE FUNCTIONS SÉPARÉES
// ============================================================================

/**
 * Étape 1: Crée une commande (order) pour la courbe de charge
 * Edge Function: create-order
 */
export async function createOrder(
  consentId: string,
  requests: CreateOrderRequest['requests']
): Promise<OrderResponse> {
  console.log('📝 Creating LOADCURVE order...');
  console.log('ConsentId:', consentId);
  console.log('Requests:', requests);

  const { data, error } = await supabase.functions.invoke('create-order', {
    body: {
      consentId,
      requests
    }
  });

  if (error) {
    console.error('❌ Error creating order:', error);
    throw new Error(`Erreur lors de la création de la commande: ${error.message}`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  console.log('✅ Order created:', data.id);
  return data;
}

/**
 * Étape 2: Vérifie le statut d'une commande
 * Edge Function: get-order
 */
export async function getOrder(orderId: string): Promise<OrderResponse> {
  console.log('🔄 Getting order status:', orderId);

  const { data, error } = await supabase.functions.invoke('get-order', {
    body: {
      orderId
    }
  });

  if (error) {
    console.error('❌ Error getting order:', error);
    throw new Error(`Erreur lors de la récupération de la commande: ${error.message}`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  console.log('📊 Order status:', data.status);
  return data;
}

/**
 * Étape 3: Récupère les données de la courbe de charge
 * Edge Function: get-request-data
 */
export async function getRequestData(
  requestId: string,
  format: 'json' | 'csv' = 'json',
  period: '30min' | '1h' = '30min'
): Promise<any> {
  console.log('📥 Getting request data:', requestId);
  console.log('Format:', format, '| Period:', period);

  const { data, error } = await supabase.functions.invoke('get-request-data', {
    body: {
      requestId,
      format,
      period
    }
  });

  if (error) {
    console.error('❌ Error getting request data:', error);
    throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  console.log('✅ Request data received');
  return data;
}

/**
 * Fonction helper: Polling automatique jusqu'au statut SUCCESS
 */
export async function pollOrderUntilSuccess(
  orderId: string,
  maxAttempts: number = 200,
  intervalMs: number = 5000
): Promise<OrderResponse> {
  console.log('⏳ Starting polling for order:', orderId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const order = await getOrder(orderId);

    console.log(`Attempt ${attempt}/${maxAttempts} - Status: ${order.status}`);

    if (order.status === 'SUCCESS') {
      console.log('✅ Order completed successfully!');
      return order;
    }

    if (order.status === 'ERROR') {
      throw new Error('La commande a échoué');
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error('Timeout: La commande n\'a pas été complétée dans le temps imparti');
}
