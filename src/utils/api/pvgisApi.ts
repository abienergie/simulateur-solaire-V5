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

  // Détecter si on est en développement ou en production
  const isDevelopment = import.meta.env.DEV;
  const baseUrl = isDevelopment
    ? '/pvgis-api'  // Utiliser le proxy en développement
    : 'https://re.jrc.ec.europa.eu/api';  // Appel direct en production

  try {
    // Utiliser la version 5.3 de l'API pour tester SARAH3 et crystSi2025
    console.log('🔬 Test PVGIS v5.3 avec SARAH3 et crystSi2025...');

    // Tenter d'abord v5.3 avec SARAH3 et crystSi2025
    const v53Params = new URLSearchParams({
      ...Object.fromEntries(queryParams),
      raddatabase: 'PVGIS-SARAH3',
      pvtechchoice: 'crystSi2025'
    });

    const v53Response = await fetch(`${baseUrl}/v5_3/PVcalc?${v53Params.toString()}`);

    if (v53Response.ok) {
      console.log('✅ PVGIS v5.3 avec SARAH3 et crystSi2025 disponible !');
      const v53Data: PVGISResponse = await v53Response.json();

      if (v53Data?.outputs?.totals?.fixed?.E_y) {
        return v53Data;
      }
    }

    console.warn('⚠️ PVGIS v5.3 avec SARAH3/crystSi2025 non disponible, test v5.2...');

    // Fallback vers v5.2 avec SARAH2
    const response = await fetch(`${baseUrl}/v5_2/PVcalc?${queryParams.toString()}`);

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