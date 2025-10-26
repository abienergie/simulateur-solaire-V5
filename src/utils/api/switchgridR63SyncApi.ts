import { supabase } from '../../lib/supabase';

export interface R63SyncDataPoint {
  datetime: string;
  power_kw: number;
}

export interface R63SyncResponse {
  success: boolean;
  orderId: string;
  requestId: string;
  count: number;
  rows: R63SyncDataPoint[];
  period: {
    start: string;
    end: string;
  };
}

/**
 * Crée une commande R63_SYNC (courbe de charge en soutirage, max 7 jours)
 * et attend que les données soient disponibles
 * @param period - Pas de temps: '15min', '30min', '1h' (défaut: '30min')
 */
export async function createR63SyncOrder(
  prm: string,
  consentId: string,
  startDate?: string,
  endDate?: string,
  period: string = '30min'
): Promise<R63SyncResponse> {
  console.log('📞 Calling R63_SYNC Edge Function...');
  console.log(`📊 Period: ${period}`);
  console.log(`📅 Date range: ${startDate} → ${endDate}`);

  const { data, error } = await supabase.functions.invoke('switchgrid-r63-sync', {
    body: {
      action: 'create_r63_sync_order_and_poll',
      prm,
      consent_id: consentId,
      start_date: startDate,
      end_date: endDate,
      period,
      returnRows: true
    }
  });

  if (error) {
    console.error('❌ R63_SYNC Edge Function error:', error);
    throw new Error(`Erreur lors de la récupération de la courbe de charge: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Échec de la récupération de la courbe de charge');
  }

  console.log(`✅ R63_SYNC data retrieved: ${data.count} points`);
  return data;
}
