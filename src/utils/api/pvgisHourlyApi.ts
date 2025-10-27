import { PVGISHourlyParams, PVGISHourlyResponse, ProcessedHourlyData } from '../../types/pvgisHourly';

const LAST_SARAH3_YEAR = 2023;   // PVGIS 5.3: datasets étendus jusqu'à 2023

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

export async function fetchPVGISHourly(params: PVGISHourlyParams): Promise<ProcessedHourlyData[]> {
  try {
    console.log('🔄 Appel API PVGIS horaire avec paramètres:', params);

    const isDevelopment = import.meta.env.DEV;

    // 1) Années sûres pour SARAH3
    const startyear = Math.min(params.startyear, LAST_SARAH3_YEAR);
    const endyear   = Math.min(params.endyear ?? params.startyear, LAST_SARAH3_YEAR);

    const queryParams = new URLSearchParams({
      lat: params.lat.toString(),
      lon: params.lon.toString(),
      raddatabase: 'PVGIS-SARAH3',
      startyear: startyear.toString(),
      endyear: endyear.toString(),
      pvcalculation: '1',
      peakpower: params.peakpower.toString(),
      loss: params.loss.toString(),
      pvtechchoice: 'crystSi',
      mountingplace: 'free',
      usehorizon: '1',
      localtime: '1',
      outputformat: 'json'
    });

    // 1. Angle/azimut : n'envoie que si l'utilisateur les a saisis
    if (typeof params.angle === 'number' && typeof params.aspect === 'number') {
      queryParams.set('angle', params.angle.toString());
      queryParams.set('aspect', params.aspect.toString());
    } else {
      queryParams.set('optimalinclination', '1');
    }

    let response: Response;

    // En développement, utiliser le proxy Vite
    if (isDevelopment) {
      const apiUrl = `/pvgis-api/v5_3/seriescalc?${queryParams.toString()}`;
      console.log('🌐 URL API PVGIS (via Vite proxy):', apiUrl);

      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
    } else {
      // En production, utiliser un proxy CORS public
      const pvgisUrl = `https://re.jrc.ec.europa.eu/api/v5_3/seriescalc?${queryParams.toString()}`;
      console.log('🌐 URL API PVGIS (via proxy CORS):', pvgisUrl);

      response = await fetchWithCorsProxy(pvgisUrl);
    }

    if (!response.ok) {
      // 3) remonter le message détaillé que PVGIS renvoie (souvent très explicite)
      const text = await response.text();
      throw new Error(`Erreur PVGIS (${response.status}): ${text || response.statusText}`);
    }

    const data: PVGISHourlyResponse = await response.json();
    
    if (!data?.outputs?.hourly) {
      throw new Error('Format de réponse PVGIS invalide - données horaires manquantes');
    }

    console.log('✅ Données PVGIS horaires reçues:', data.outputs.hourly.length, 'points');
    
    // Sauvegarder la réponse brute pour debug
    localStorage.setItem('pvgis_hourly_raw', JSON.stringify(data));
    
    // Traiter les données pour l'affichage
    const processedData: ProcessedHourlyData[] = data.outputs.hourly.map(point => {
      // 3. Horodatage PVGIS : détecter format ISO vs compact
      let dateObj: Date;
      let timestamp: string;
      let date: string;
      let time: string;
      
      const timeStr = String(point.time);
      
      if (timeStr.includes('T')) {
        // Format ISO : "2023-01-01T13:00:00"
        dateObj = new Date(timeStr);
        timestamp = dateObj.toLocaleString('fr-FR');
        date = dateObj.toLocaleDateString('fr-FR');
        time = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } else if (/^\d{12}$/.test(timeStr)) {
        // Format compact : "YYYYMMDDHHMM"
        const year = timeStr.substring(0, 4);
        const month = timeStr.substring(4, 6);
        const day = timeStr.substring(6, 8);
        const hour = timeStr.substring(8, 10);
        const minute = timeStr.substring(10, 12);
        
        dateObj = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
        date = `${day}/${month}/${year}`;
        time = `${hour}:${minute}`;
        timestamp = `${date} ${time}`;
      } else {
        // Format inconnu, utiliser tel quel
        timestamp = timeStr;
        date = timeStr;
        time = '';
      }
      
      // 4. kW vs kWh : multiplier par la durée du pas
      // Meta pour connaître la durée du pas (min) si dispo
      const stepMin = data?.meta?.time_step ?? data?.meta?.timestep ?? data?.outputs?.timestep ?? 60;
      const hoursPerStep = Number(stepMin) / 60;
      
      // Puissance instantanée P en W -> kW
      const powerKw = (Number(point.P) || 0) / 1000;
      // Énergie sur le pas (kWh)
      const production = powerKw * hoursPerStep;
      
      return {
        timestamp,
        date,
        time,
        production,
        // 6. Irradiance gardée pour debug mais pas forcément affichée
        irradiance: point.G_i,
        temperature: point.T2m
      };
    });

    console.log('✅ Données traitées:', processedData.length, 'points horaires');
    return processedData;
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel PVGIS horaire:', error);
    throw new Error(`Impossible de récupérer les données PVGIS horaires: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
