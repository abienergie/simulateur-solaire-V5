import { getSunshineHours } from '../sunshineData';
import { getPowerLimit } from './powerLimits';
import { calculateAutoconsommation } from './autoconsommation';
import { calculateFinancialBenefits } from './financialCalculator';
import { useFinancialSettings } from '../../contexts/FinancialSettingsContext';

interface RecommendationParams {
  consommationAnnuelle: number;
  codePostal: string;
  typeCompteur: string;
}

export function calculateRecommendation(params: RecommendationParams) {
  const { consommationAnnuelle, codePostal, typeCompteur } = params;
  
  if (!consommationAnnuelle || !codePostal || consommationAnnuelle <= 0) return null;

  const departement = codePostal.substring(0, 2);
  const productivite = getSunshineHours(departement);
  
  // Ratio optimisé : viser 40% de la consommation pour un bon équilibre
  // Pour 30000kWh, on recommande 36kWc (30000 * 0.4 / 1100 = 10.9kWc, arrondi à 36kWc max)
  const RATIO_CIBLE = 0.4;
  const RATIO_MAX = 1.2; // Limite à 120% de la consommation
  
  // Calcul de la puissance recommandée
  let puissanceRecommandee = (consommationAnnuelle * RATIO_CIBLE) / productivite * 1000;
  
  // Calculer la puissance maximale pour ne pas dépasser 120% de la consommation
  const puissanceMax = (consommationAnnuelle * RATIO_MAX) / productivite * 1000;
  
  // Puissance minimum de 3kWc pour optimiser le retour sur investissement
  puissanceRecommandee = Math.max(puissanceRecommandee, 3);
  
  // Limiter à 120% de la consommation
  puissanceRecommandee = Math.min(puissanceRecommandee, puissanceMax);
  
  // Récupérer les puissances disponibles depuis les prix d'installation
  const savedPrices = localStorage.getItem('installation_prices');
  let availablePowers = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 12.0, 15.0, 18.0, 20.0, 25.0, 30.0, 36.0];
  
  if (savedPrices) {
    try {
      const customPrices = JSON.parse(savedPrices);
      const customPowers = customPrices.map((p: any) => p.power).filter((p: number) => p > 9);
      // Ajouter les puissances personnalisées aux puissances standard
      availablePowers = [...availablePowers, ...customPowers].sort((a, b) => a - b);
    } catch (e) {
      console.error('Error parsing custom prices:', e);
    }
  }
  
  // Limitation selon le type de compteur pour les puissances ≤ 9kWc
  const powerLimit = getPowerLimit(typeCompteur);
  
  // CORRECTION: Appliquer la limitation du compteur monophasé à TOUTES les puissances
  let puissanceLimitee = puissanceRecommandee;
  
  // Si monophasé, limiter STRICTEMENT à 6 kWc (limitation physique du compteur)
  if (typeCompteur === 'monophase') {
    puissanceLimitee = Math.min(puissanceRecommandee, powerLimit);
    console.log(`Limitation monophasé appliquée: ${puissanceRecommandee.toFixed(1)} kWc → ${puissanceLimitee.toFixed(1)} kWc`);
  } else {
    // Si triphasé, pas de limitation de compteur mais respecter 120% max
    // Filtrer les puissances qui ne dépassent pas 120% de la consommation
    const affordablePowers = availablePowers.filter(p => {
      const estimatedProduction = p * productivite;
      return estimatedProduction <= (consommationAnnuelle * RATIO_MAX);
    });
    
    if (affordablePowers.length > 0) {
      puissanceLimitee = affordablePowers.reduce((prev, curr) => {
        return Math.abs(curr - puissanceRecommandee) < Math.abs(prev - puissanceRecommandee) ? curr : prev;
      });
    } else {
      // Si toutes les puissances dépassent 120%, prendre la plus petite disponible
      puissanceLimitee = Math.min(...availablePowers);
    }
  }
  
  // Vérification finale : s'assurer qu'on ne dépasse pas 120%
  const estimatedProduction = puissanceLimitee * productivite;
  if (estimatedProduction > (consommationAnnuelle * RATIO_MAX)) {
    // Recalculer la puissance pour respecter exactement 120%
    puissanceLimitee = (consommationAnnuelle * RATIO_MAX) / productivite;
    
    // Arrondir à la puissance disponible la plus proche (en dessous)
    const availablePowersBelow = availablePowers.filter(p => p <= puissanceLimitee);
    if (availablePowersBelow.length > 0) {
      puissanceLimitee = availablePowersBelow.reduce((prev, curr) => {
        return Math.abs(curr - puissanceRecommandee) < Math.abs(prev - puissanceRecommandee) ? curr : prev;
      });
    } else {
      // Fallback sur la plus petite puissance disponible
      puissanceLimitee = Math.min(...availablePowers);
    }
  }
  
  // Calcul du nombre de modules (500W par module)
  const nombreModules = Math.ceil(puissanceLimitee * 1000 / 500);
  
  // Recalcul de la puissance réelle
  const puissanceReelle = (nombreModules * 500) / 1000;
  
  // Calcul de la production estimée
  // Calcul d'une fourchette de production (min/max)
  const productionOptimale = Math.round(puissanceReelle * productivite);
  const productionMinimale = Math.round(productionOptimale * 0.7); // 30% de moins que l'optimal
  const productionMaximale = productionOptimale;
  
  const production = {
    min: productionMinimale,
    max: productionMaximale,
    optimal: productionOptimale
  };

  // Calcul du taux d'autoconsommation
  const tauxAutoconsommation = calculateAutoconsommation(productionOptimale, consommationAnnuelle);

  // Calcul des bénéfices financiers
  const { economiesAnnuelles, reventeAnnuelle } = calculateFinancialBenefits(
    productionOptimale,
    tauxAutoconsommation
  );

  // Message d'avertissement uniquement si on est limité par le type de compteur ET qu'on est en monophasé
  let avertissement = null;
  
  // Avertissement pour limitation par type de compteur (monophasé uniquement)
  if (puissanceRecommandee > powerLimit && typeCompteur === 'monophase' && puissanceRecommandee <= 9) {
    avertissement = `Une installation plus puissante de ${puissanceRecommandee.toFixed(1)} kWc maximiserait vos économies. Contactez-nous pour étudier la possibilité de passer en triphasé.`;
  }
  
  // Avertissement pour limitation à 120% (avec suggestion de batterie)
  const finalProduction = Math.round(puissanceReelle * productivite);
  const finalCoverage = (finalProduction / consommationAnnuelle) * 100;
  if (finalCoverage >= 115) { // À partir de 115%, suggérer une batterie
    avertissement = `Cette installation couvre ${Math.round(finalCoverage)}% de votre consommation. Pour optimiser votre autoconsommation, nous recommandons d'ajouter une solution de stockage (batterie physique ou virtuelle).`;
  }

  return {
    nombreModules,
    puissanceCrete: puissanceReelle,
    production,
    tauxAutoconsommation,
    economiesAnnuelles,
    reventeAnnuelle,
    avertissement
  };
}