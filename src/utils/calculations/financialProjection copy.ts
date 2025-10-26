import { FinancialParameters, FinancialProjection, YearlyProjection } from '../../types/financial';
import { getSubscriptionPrice, getPriceFromPower, calculateFinalPrice } from './priceCalculator';
import { PHYSICAL_BATTERIES, VIRTUAL_BATTERIES } from '../constants/batteryOptions';
import { calculateHT } from './vatCalculator';

function calculateYearlyValues(
  params: FinancialParameters,
  year: number,
  baseProduction: number,
  puissanceCrete: number,
  microOnduleurs: boolean = false
): YearlyProjection {
  // Basic coefficients
  const coefficientDegradation = Math.pow(1 + params.degradationPanneau / 100, year - 1);
  const coefficientIndexation = Math.pow(1 + params.indexationProduction / 100, year - 1);
  const coefficientPrix = Math.pow(1 + params.revalorisationEnergie / 100, year - 1);
  
  // Production with degradation
  const production = baseProduction * coefficientDegradation;

  // Calculate base autoconsumption rate
  // on prend bien le paramètre mis à jour dans FinancialParameters
  const autoconsommationRate = (params.autoconsommation ?? 0) / 100;

  // Calculate energy distribution
  const autoconsommation = production * autoconsommationRate;
  const revente = production * (1 - autoconsommationRate);
  
  console.log('🔋 physique -> rate=', autoconsommationRate, 'production=', production, 'revente kWh=', revente);
  
  // Price calculations
  const prixKwhActualise = params.prixKwh * coefficientPrix;
  const economiesAutoconsommation = autoconsommation * prixKwhActualise;
  
  // Calculate revenue from surplus/resale
  let revenusRevente = 0;
  
  if (params.batterySelection?.type === 'mybattery') {
    // For MyBattery: surplus = (kWh price - 0.0996€) * surplus amount
    const prixSurplus = Math.max(0, prixKwhActualise - 0.0996);
    revenusRevente = revente * prixSurplus;
  } else {
    // Standard feed-in tariff for other cases (including physical battery)
    const tarifReventeActualise = year <= 20 ? params.tarifRevente * coefficientIndexation : 0;
    revenusRevente = revente * tarifReventeActualise;
  }

  // Subscription costs
  const dureeAbonnement = params.dureeAbonnement || 20;
  let coutAbonnement = 0;
  if (params.financingMode === 'subscription' && year <= dureeAbonnement) {
    const subscriptionPrice = getSubscriptionPrice(puissanceCrete, dureeAbonnement);
    // Si calculateWithVAT est true, on utilise le prix HT
    coutAbonnement = params.calculateWithVAT ? calculateHT(subscriptionPrice) * 12 : subscriptionPrice * 12;
  }

  // Add monthly cost of physical battery in subscription mode
  if (
    params.financingMode === 'subscription' &&
    params.batterySelection?.type === 'physical' &&
    params.batterySelection.model?.monthlyPrice &&
    year <= dureeAbonnement
  ) {
    const batteryMonthlyPrice = params.batterySelection.model.monthlyPrice;
    coutAbonnement += params.calculateWithVAT ? calculateHT(batteryMonthlyPrice) * 12 : batteryMonthlyPrice * 12;
  }

  // MyLight/Battery costs
  let coutMyLight = 0;
  if (params.batterySelection?.type === 'virtual' || params.batterySelection?.type === 'mybattery') {
    if (params.batterySelection.type === 'virtual') {
      // Smart Battery costs - monthly subscription only, no setup fee
      const virtualBattery = VIRTUAL_BATTERIES.find(b => b.capacity === params.batterySelection?.virtualCapacity);
      if (virtualBattery) {
        const monthlyPrice = virtualBattery.monthlyPrice;
        coutMyLight = params.calculateWithVAT ? calculateHT(monthlyPrice) * 12 : monthlyPrice * 12;
      }
    } else if (params.batterySelection.type === 'mybattery') {
      // MyBattery: 1.20€/kWc/month (TVA 20%), no setup fee
      const monthlyPrice = puissanceCrete * 1.20;
      coutMyLight = params.calculateWithVAT ? calculateHT(monthlyPrice) * 12 : monthlyPrice * 12;
    }
  }

  const gainTotal = economiesAutoconsommation + revenusRevente - coutAbonnement - coutMyLight;

  return {
    annee: year,
    production,
    autoconsommation,
    revente,
    economiesAutoconsommation,
    revenusRevente,
    coutAbonnement,
    coutMyLight,
    gainTotal
  };
}

export function generateFinancialProjection(
  params: FinancialParameters,
  productionAnnuelle: number,
  puissanceCrete: number,
  microOnduleurs: boolean = false
): FinancialProjection {
  const projectionAnnuelle: YearlyProjection[] = [];
  let totalAutoconsommation = 0;
  let totalRevente = 0;
  let totalAbonnement = 0;
  let totalMyLight = 0;
  let totalGains = 0;

  for (let year = 1; year <= 30; year++) {
    const yearlyValues = calculateYearlyValues(params, year, productionAnnuelle, puissanceCrete, microOnduleurs);
    projectionAnnuelle.push(yearlyValues);

    totalAutoconsommation += yearlyValues.economiesAutoconsommation;
    totalRevente += yearlyValues.revenusRevente;
    totalAbonnement += yearlyValues.coutAbonnement;
    totalMyLight += yearlyValues.coutMyLight;
    totalGains += yearlyValues.gainTotal;
  }

  const moyenneAnnuelle = {
    autoconsommation: totalAutoconsommation / 30,
    revente: totalRevente / 30,
    abonnement: totalAbonnement / 30,
    myLight: totalMyLight / 30,
    total: totalGains / 30
  };

  // Calculate installation price including physical battery if present
  let prixInstallation = getPriceFromPower(puissanceCrete);
  if (params.financingMode === 'cash') {
    if (params.batterySelection?.type === 'physical' && params.batterySelection.model) {
      prixInstallation += params.batterySelection.model.oneTimePrice;
    }
    if (microOnduleurs) {
      // Add Enphase cost (0.50€/Wc)
      prixInstallation += Math.ceil((puissanceCrete * 500) / 100) * 100;
    }
  }

  let prixFinal = calculateFinalPrice(
    puissanceCrete,
    params.primeAutoconsommation,
    params.remiseCommerciale,
    microOnduleurs
  );

  // Si calculateWithVAT est true et mode cash, convertir en HT
  if (params.calculateWithVAT && params.financingMode === 'cash') {
    prixFinal = calculateHT(prixFinal);
  }

  let fraisActivation = 0;
  let smartBatteryInitialCost = 0;
  let physicalBatteryInitialCost = 0;

  // Calculate initial costs for batteries (both modes)
  if (params.batterySelection?.type === 'virtual') {
    const virtualBattery = VIRTUAL_BATTERIES.find(b => b.capacity === params.batterySelection?.virtualCapacity);
    if (virtualBattery?.setupFee) {
      smartBatteryInitialCost = virtualBattery.setupFee;
    }
  } else if (params.financingMode === 'subscription' && params.batterySelection?.type === 'physical' && params.batterySelection.model) {
    physicalBatteryInitialCost = params.batterySelection.model.oneTimePrice;
  }

  let cumulGains = 0;
  let anneeRentabilite = 0;
  const initialCost = params.financingMode === 'subscription' ?
    (fraisActivation + smartBatteryInitialCost + physicalBatteryInitialCost) :
    (prixFinal + smartBatteryInitialCost);

  for (let i = 0; i < projectionAnnuelle.length; i++) {
    cumulGains += projectionAnnuelle[i].gainTotal;
    if (cumulGains >= initialCost && anneeRentabilite === 0) {
      anneeRentabilite = i + 1;
    }
  }

  return {
    projectionAnnuelle,
    totalAutoconsommation,
    totalRevente,
    totalAbonnement,
    totalMyLight,
    totalGains,
    moyenneAnnuelle,
    anneeRentabilite,
    prixInstallation,
    primeAutoconsommation: params.primeAutoconsommation,
    remiseCommerciale: params.remiseCommerciale,
    prixFinal,
    fraisActivation,
    smartBatteryInitialCost,
    physicalBatteryInitialCost
  };
}
