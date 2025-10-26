import { parseISO, getHours, getMinutes, getMonth, getDate, format } from 'date-fns';

interface LoadCurveDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

interface PVGISHourlyDataPoint {
  time: string;
  P: number;
  G_i: number;
  H_sun: number;
  T2m: number;
}

// Interface pour les données PVGIS déjà traitées (format de pvgisHourlyApi.ts)
interface ProcessedPVGISData {
  timestamp: string;
  date: string;
  time: string;
  production: number; // Déjà en kWh
  irradiance?: number;
  temperature?: number;
}

interface AutoconsumptionResult {
  timestamp: string;
  consumption: number;
  production: number;
  autoconsumption: number;
  surplus: number;
  gridImport: number;
  batteryCharge?: number;
  batteryDischarge?: number;
  batteryLevel?: number;
}

interface AutoconsumptionMetrics {
  totalConsumption: number;
  totalProduction: number;
  totalAutoconsumption: number;
  totalSurplus: number;
  totalGridImport: number;
  autoconsumptionRate: number;
  selfProductionRate: number;
  selfSufficiencyRate: number;
  hourlyData: AutoconsumptionResult[];
  monthlyData: {
    month: string;
    consumption: number;
    production: number;
    autoconsumption: number;
    autoconsumptionRate: number;
  }[];
}

export function alignTimeSeriesData(
  loadCurve: LoadCurveDataPoint[],
  pvgisHourlyData: PVGISHourlyDataPoint[] | ProcessedPVGISData[]
): { consumption: number; production: number; timestamp: string }[] {

  console.log('🔍 LoadCurve received:', loadCurve.length, 'points');
  if (loadCurve.length > 0) {
    console.log('📅 First loadCurve point:', loadCurve[0].timestamp);
    console.log('📅 Last loadCurve point:', loadCurve[loadCurve.length - 1].timestamp);
  }

  // Créer une map des données PVGIS par heure (profil type d'une année)
  const pvgisMap = new Map<string, number>();

  console.log('🔍 Building PVGIS map from', pvgisHourlyData.length, 'points');
  console.log('📋 Sample PVGIS point:', pvgisHourlyData[0]);

  // Déterminer si les données sont déjà traitées ou brutes
  const isProcessed = 'production' in pvgisHourlyData[0];
  console.log('📦 PVGIS data type:', isProcessed ? 'Processed (with energy)' : 'Raw (with power)');

  pvgisHourlyData.forEach(point => {
    let timeStr: string;
    let energyKwh: number;

    if (isProcessed) {
      // Données déjà traitées par pvgisHourlyApi.ts
      const processedPoint = point as ProcessedPVGISData;
      timeStr = processedPoint.timestamp;
      energyKwh = processedPoint.production; // Déjà en kWh
    } else {
      // Données brutes PVGIS
      const rawPoint = point as PVGISHourlyDataPoint;
      timeStr = String(rawPoint.time);
      // P est en Watts, on convertit en kW puis en kWh pour 1h
      const powerKw = rawPoint.P / 1000;
      energyKwh = powerKw * 1; // 1 heure
    }

    let month: string, day: string, hour: string;

    if (timeStr.includes('T')) {
      // Format ISO : "2020-01-01T13:00:00"
      const date = new Date(timeStr);
      month = (date.getMonth() + 1).toString().padStart(2, '0');
      day = date.getDate().toString().padStart(2, '0');
      hour = date.getHours().toString().padStart(2, '0');
    } else if (timeStr.includes(':') && !timeStr.includes('/')) {
      // Format PVGIS avec ":" : "YYYYMMDD:HHMM" -> "20201231:1610"
      const [datePart, timePart] = timeStr.split(':');
      month = datePart.substring(4, 6);
      day = datePart.substring(6, 8);
      hour = timePart.substring(0, 2);
    } else if (/^\d{12}$/.test(timeStr)) {
      // Format compact : "YYYYMMDDHHMM" -> "202001011300"
      month = timeStr.substring(4, 6);
      day = timeStr.substring(6, 8);
      hour = timeStr.substring(8, 10);
    } else if (timeStr.includes('/')) {
      // Format localisé : "01/01/2020 13:00"
      const date = new Date(timeStr);
      month = (date.getMonth() + 1).toString().padStart(2, '0');
      day = date.getDate().toString().padStart(2, '0');
      hour = date.getHours().toString().padStart(2, '0');
    } else {
      console.warn('⚠️ Unknown PVGIS time format:', timeStr);
      return;
    }

    const key = `${month}${day}-${hour}`;
    pvgisMap.set(key, energyKwh);

    if (pvgisMap.size <= 3) {
      console.log(`📍 PVGIS key: ${key} = ${energyKwh.toFixed(3)} kWh`);
    }
  });

  console.log('✅ PVGIS map built with', pvgisMap.size, 'entries');

  // Aligner les données Enedis avec PVGIS
  // IMPORTANT: On limite à 1 an (365 jours) pour éviter les doublons
  const oneYearInHalfHours = 365 * 24 * 2; // 17520 demi-heures

  // Trier par date décroissante et prendre les 365 derniers jours
  const sortedLoadCurve = [...loadCurve].sort((a, b) => {
    const dateA = parseISO(a.timestamp);
    const dateB = parseISO(b.timestamp);
    return dateB.getTime() - dateA.getTime();
  });

  const lastYearLoadCurve = sortedLoadCurve.slice(0, oneYearInHalfHours);

  // Re-trier par ordre chronologique croissant pour les calculs
  const limitedLoadCurve = lastYearLoadCurve.sort((a, b) => {
    const dateA = parseISO(a.timestamp);
    const dateB = parseISO(b.timestamp);
    return dateA.getTime() - dateB.getTime();
  });

  if (loadCurve.length > oneYearInHalfHours) {
    console.warn(`⚠️ LoadCurve contains ${loadCurve.length} points (${(loadCurve.length / (24*2)).toFixed(0)} days)`);
    console.warn(`⚠️ Limiting to last year (${oneYearInHalfHours} points / 365 days)`);
  }

  const alignedData = limitedLoadCurve.map((point, index) => {
    const date = parseISO(point.timestamp);
    const month = (getMonth(date) + 1).toString().padStart(2, '0');
    const day = getDate(date).toString().padStart(2, '0');
    const hour = getHours(date).toString().padStart(2, '0');
    const minute = getMinutes(date);

    const pvgisKey = `${month}${day}-${hour}`;
    const productionHourlyKwh = pvgisMap.get(pvgisKey) || 0;

    // PVGIS: énergie pour 1 heure entière (ex: 3 kWh pour 13:00-14:00)
    // Enedis: énergie pour 30 minutes (ex: consommation de 13:00-13:30)
    // On doit répartir l'énergie horaire PVGIS sur 2 demi-heures
    let productionKwh: number;

    if (minute === 30) {
      // 13:30 = deuxième demi-heure de 13h -> prendre 50% de la production de 13h
      productionKwh = productionHourlyKwh / 2;
    } else {
      // 13:00 = première demi-heure de 13h -> prendre 50% de la production de 13h
      productionKwh = productionHourlyKwh / 2;
    }

    if (index < 3) {
      console.log(`🔗 Align ${point.timestamp} -> key ${pvgisKey} -> ${productionKwh.toFixed(3)} kWh`);
    }

    // IMPORTANT: point.value est en kW (puissance moyenne sur 30 min)
    // Il faut convertir en kWh : kW * 0.5h = kWh
    const consumptionKwh = point.value * 0.5;

    return {
      timestamp: point.timestamp,
      consumption: consumptionKwh, // Converti de kW en kWh pour 30 min
      production: productionKwh // En kWh pour 30 min
    };
  });

  const totalConso = alignedData.reduce((sum, p) => sum + p.consumption, 0);
  const totalProd = alignedData.reduce((sum, p) => sum + p.production, 0);
  console.log('📊 Total aligned consumption:', totalConso.toFixed(2), 'kWh');
  console.log('📊 Total aligned production:', totalProd.toFixed(2), 'kWh');
  console.log('📊 Number of days:', (alignedData.length / (24*2)).toFixed(1));

  return alignedData;
}

export function calculateAutoconsumption(
  loadCurve: LoadCurveDataPoint[],
  pvgisHourlyData: PVGISHourlyDataPoint[] | ProcessedPVGISData[],
  batteryCapacity: number = 0
): AutoconsumptionMetrics {

  // Aligner les données temporelles
  const alignedData = alignTimeSeriesData(loadCurve, pvgisHourlyData);

  // État de la batterie
  // Pour batterie virtuelle (>1000 kWh) : pas de limites physiques
  const isVirtualBattery = batteryCapacity >= 1000;

  let batteryLevel = isVirtualBattery ? 0 : batteryCapacity * 0.2;
  const batteryMaxCharge = isVirtualBattery ? batteryCapacity : batteryCapacity * 0.9;
  const batteryMinCharge = isVirtualBattery ? 0 : batteryCapacity * 0.1;

  // Taux de charge/décharge par demi-heure
  const maxChargeRate = isVirtualBattery ? Infinity : batteryCapacity * 0.5;

  // Calculer pour chaque point
  const hourlyData: AutoconsumptionResult[] = alignedData.map((point, index) => {
    const consumption = point.consumption;
    const production = point.production;

    let autoconsumption = 0;
    let surplus = 0;
    let gridImport = 0;
    let batteryCharge = 0;
    let batteryDischarge = 0;

    // Calcul sans batterie d'abord
    const directAutoconsumption = Math.min(production, consumption);
    let remainingProduction = production - directAutoconsumption;
    let remainingConsumption = consumption - directAutoconsumption;

    autoconsumption = directAutoconsumption;

    // Si batterie activée
    if (batteryCapacity > 0) {
      // Charger la batterie avec le surplus
      if (remainingProduction > 0) {
        const canCharge = Math.min(
          remainingProduction,
          batteryMaxCharge - batteryLevel,
          maxChargeRate
        );
        batteryCharge = canCharge;
        batteryLevel += canCharge;
        remainingProduction -= canCharge;
      }

      // Décharger la batterie pour couvrir le manque
      if (remainingConsumption > 0 && batteryLevel > batteryMinCharge) {
        const canDischarge = Math.min(
          remainingConsumption,
          batteryLevel - batteryMinCharge,
          maxChargeRate
        );
        batteryDischarge = canDischarge;
        batteryLevel -= canDischarge;
        autoconsumption += canDischarge;
        remainingConsumption -= canDischarge;
      }
    }

    surplus = remainingProduction;
    gridImport = remainingConsumption;

    return {
      timestamp: point.timestamp,
      consumption,
      production,
      autoconsumption,
      surplus,
      gridImport,
      ...(batteryCapacity > 0 && {
        batteryCharge,
        batteryDischarge,
        batteryLevel
      })
    };
  });

  // Calculer les totaux
  const totalConsumption = hourlyData.reduce((sum, p) => sum + p.consumption, 0);
  const totalProduction = hourlyData.reduce((sum, p) => sum + p.production, 0);
  const totalAutoconsumption = hourlyData.reduce((sum, p) => sum + p.autoconsumption, 0);
  const totalSurplus = hourlyData.reduce((sum, p) => sum + p.surplus, 0);
  const totalGridImport = hourlyData.reduce((sum, p) => sum + p.gridImport, 0);

  // Calculer les taux
  // Taux d'autoconsommation : part de la production qui est consommée directement
  const autoconsumptionRate = totalProduction > 0
    ? (totalAutoconsumption / totalProduction) * 100
    : 0;

  // Taux d'autoproduction : part de la consommation couverte par le solaire
  const selfProductionRate = totalConsumption > 0
    ? (totalAutoconsumption / totalConsumption) * 100
    : 0;

  // Autosuffisance = identique à selfProductionRate (doublon supprimé dans l'interface)
  const selfSufficiencyRate = selfProductionRate;

  // Agréger par mois
  const monthlyMap = new Map<string, {
    consumption: number;
    production: number;
    autoconsumption: number;
  }>();

  hourlyData.forEach(point => {
    const monthKey = format(parseISO(point.timestamp), 'yyyy-MM');
    const existing = monthlyMap.get(monthKey) || { consumption: 0, production: 0, autoconsumption: 0 };

    monthlyMap.set(monthKey, {
      consumption: existing.consumption + point.consumption,
      production: existing.production + point.production,
      autoconsumption: existing.autoconsumption + point.autoconsumption
    });
  });

  const monthlyData = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      ...data,
      autoconsumptionRate: data.production > 0
        ? (data.autoconsumption / data.production) * 100
        : 0
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalConsumption,
    totalProduction,
    totalAutoconsumption,
    totalSurplus,
    totalGridImport,
    autoconsumptionRate,
    selfProductionRate,
    selfSufficiencyRate,
    hourlyData,
    monthlyData
  };
}
