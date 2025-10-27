import { PVGISParams, PVGISResponse } from '../../types/pvgis';

const PVGIS_URL = 'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc';

export async function getPVGISData(params: PVGISParams): Promise<PVGISResponse> {
  const queryParams = new URLSearchParams({
    lat: params.lat.toString(),
    lon: params.lon.toString(),
    peakpower: params.peakPower.toString(),
    loss: params.systemLoss.toString(),
    angle: params.tilt.toString(),
    aspect: params.azimuth.toString(),
    outputformat: 'json',
    pvtechchoice: 'crystSi',
    mountingplace: 'free',
    raddatabase: 'PVGIS-SARAH2',
    browser: '1'
  });

  // Détecter l'environnement et choisir la bonne stratégie
  const isDevelopment = import.meta.env.DEV;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  try {
    // En production, utiliser la Edge Function Supabase comme proxy
    if (!isDevelopment && SUPABASE_URL) {
      console.log('🔬 Test PVGIS v5.3 via Edge Function...');

      // Tenter d'abord v5.3 avec SARAH3 et crystSi2025
      const v53Params = new URLSearchParams({
        ...Object.fromEntries(queryParams),
        raddatabase: 'PVGIS-SARAH3',
        pvtechchoice: 'crystSi2025',
        version: 'v5_3',
        endpoint: 'PVcalc'
      });

      const v53Response = await fetch(`${SUPABASE_URL}/functions/v1/pvgis-proxy?${v53Params.toString()}`);

      if (v53Response.ok) {
        const v53Data: PVGISResponse = await v53Response.json();

        if (v53Data?.outputs?.totals?.fixed?.E_y) {
          console.log('✅ PVGIS v5.3 avec SARAH3 disponible !');
          return v53Data;
        }
      }

      console.warn('⚠️ PVGIS v5.3 non disponible, fallback vers v5.2...');

      // Fallback vers v5.2 avec SARAH2
      const v52Params = new URLSearchParams({
        ...Object.fromEntries(queryParams),
        version: 'v5_2',
        endpoint: 'PVcalc'
      });

      const v52Response = await fetch(`${SUPABASE_URL}/functions/v1/pvgis-proxy?${v52Params.toString()}`);

      if (!v52Response.ok) {
        const errorData = await v52Response.json().catch(() => ({}));
        throw new Error(`Erreur PVGIS (${v52Response.status}): ${errorData.message || v52Response.statusText}`);
      }

      const data: PVGISResponse = await v52Response.json();

      if (!data?.outputs?.totals?.fixed?.E_y) {
        throw new Error('Format de réponse PVGIS invalide');
      }

      console.log('✅ Utilisation de PVGIS v5.2 avec SARAH2');
      return data;
    }

    // En développement, utiliser le proxy Vite
    console.log('🔬 Test PVGIS v5.3 via proxy Vite...');

    const v53Params = new URLSearchParams({
      ...Object.fromEntries(queryParams),
      raddatabase: 'PVGIS-SARAH3',
      pvtechchoice: 'crystSi2025'
    });

    const v53Response = await fetch(`/pvgis-api/v5_3/PVcalc?${v53Params.toString()}`);

    if (v53Response.ok) {
      console.log('✅ PVGIS v5.3 avec SARAH3 et crystSi2025 disponible !');
      const v53Data: PVGISResponse = await v53Response.json();

      if (v53Data?.outputs?.totals?.fixed?.E_y) {
        return v53Data;
      }
    }

    console.warn('⚠️ PVGIS v5.3 non disponible, test v5.2...');

    const response = await fetch(`/pvgis-api/v5_2/PVcalc?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Erreur PVGIS (${response.status}): ${response.statusText}`);
    }

    const data: PVGISResponse = await response.json();

    if (!data?.outputs?.totals?.fixed?.E_y) {
      throw new Error('Format de réponse PVGIS invalide');
    }

    console.log('✅ Utilisation de PVGIS v5.2 avec SARAH2');
    return data;

  } catch (error) {
    console.error('Erreur lors de l\'appel PVGIS:', error);
    throw new Error(`Impossible de récupérer les données PVGIS: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

export async function getPVGISMonthlyData(params: PVGISParams): Promise<any> {
  // Cette fonction peut être utilisée pour récupérer des données mensuelles détaillées
  const data = await getPVGISData(params);
  return data.outputs.monthly.fixed;
}
