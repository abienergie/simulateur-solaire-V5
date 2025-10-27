import { PVGISParams, PVGISResponse } from '../../types/pvgis';

const PVGIS_URL = 'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc';

async function fetchWithCorsProxy(url: string): Promise<Response> {
  // Liste de proxies CORS publics avec fallback
  const corsProxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  for (const proxy of corsProxies) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      console.log(`🔄 Tentative avec proxy: ${proxy}`);

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`✅ Proxy fonctionnel: ${proxy}`);
        return response;
      }
    } catch (error) {
      console.warn(`⚠️ Proxy échoué: ${proxy}`, error);
      continue;
    }
  }

  throw new Error('Tous les proxies CORS ont échoué');
}

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

  const isDevelopment = import.meta.env.DEV;

  try {
    // En développement, utiliser le proxy Vite
    if (isDevelopment) {
      console.log('🔬 Test PVGIS v5.3 via proxy Vite...');

      const v53Params = new URLSearchParams({
        ...Object.fromEntries(queryParams),
        raddatabase: 'PVGIS-SARAH3',
        pvtechchoice: 'crystSi2025'
      });

      const v53Response = await fetch(`/pvgis-api/v5_3/PVcalc?${v53Params.toString()}`);

      if (v53Response.ok) {
        const v53Data: PVGISResponse = await v53Response.json();
        if (v53Data?.outputs?.totals?.fixed?.E_y) {
          console.log('✅ PVGIS v5.3 avec SARAH3 disponible !');
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
    }

    // En production, utiliser un proxy CORS public
    console.log('🔬 Test PVGIS v5.3 via proxy CORS...');

    // Tenter d'abord v5.3 avec SARAH3 et crystSi2025
    const v53Params = new URLSearchParams({
      ...Object.fromEntries(queryParams),
      raddatabase: 'PVGIS-SARAH3',
      pvtechchoice: 'crystSi2025'
    });

    const v53Url = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${v53Params.toString()}`;

    try {
      const v53Response = await fetchWithCorsProxy(v53Url);
      const v53Data: PVGISResponse = await v53Response.json();

      if (v53Data?.outputs?.totals?.fixed?.E_y) {
        console.log('✅ PVGIS v5.3 avec SARAH3 disponible !');
        return v53Data;
      }
    } catch (error) {
      console.warn('⚠️ PVGIS v5.3 non disponible, fallback vers v5.2...', error);
    }

    // Fallback vers v5.2 avec SARAH2
    const v52Url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?${queryParams.toString()}`;
    const v52Response = await fetchWithCorsProxy(v52Url);

    if (!v52Response.ok) {
      throw new Error(`Erreur PVGIS (${v52Response.status}): ${v52Response.statusText}`);
    }

    const data: PVGISResponse = await v52Response.json();

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
