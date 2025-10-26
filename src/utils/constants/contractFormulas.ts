/**
 * Référence des formules tarifaires Enedis
 * Source: Nomenclature officielle des codes contrats
 */

export interface ContractFormula {
  code: string;
  name: string;
  description: string;
  segment: string;
  timeSlots: number; // Nombre de cadrans/postes de consommation
  voltage: 'BTinf' | 'BTsup'; // Basse Tension Inférieure (<36kVA) ou Supérieure (36-250kW)
  type: 'BASE' | 'HP_HC' | 'HP_HC_SEASONAL' | 'LONG_USE';
}

export const CONTRACT_FORMULAS: Record<string, ContractFormula> = {
  // Basse Tension Inférieure (<36kVA) - Segment C5
  BTINFCUST: {
    code: 'BTINFCUST',
    name: 'BT INF Courtes Utilisations Simple Tarif',
    description: 'Sites ayant une puissance inférieure à 36kVA en Courtes Utilisations et sur 1 poste de consommations (Base)',
    segment: 'C5',
    timeSlots: 1,
    voltage: 'BTinf',
    type: 'BASE'
  },

  BTINFMUDT: {
    code: 'BTINFMUDT',
    name: 'BT INF Moyennes Utilisations Double Tarif',
    description: 'Sites ayant une puissance inférieure à 36kVA en Moyennes Utilisations et sur 2 postes de consommations (Heures Creuses/Heures Pleines)',
    segment: 'C5',
    timeSlots: 2,
    voltage: 'BTinf',
    type: 'HP_HC'
  },

  BTINFLU: {
    code: 'BTINFLU',
    name: 'BT INF Longues Utilisations',
    description: 'Sites ayant une puissance inférieure à 36kVA en Longues Utilisations (concerne principalement les éclairages publics)',
    segment: 'C5',
    timeSlots: 1,
    voltage: 'BTinf',
    type: 'LONG_USE'
  },

  BTINFCU4: {
    code: 'BTINFCU4',
    name: 'BT INF Courtes Utilisations 4 postes',
    description: 'Sites ayant une puissance inférieure à 36kVA en Courtes Utilisations et sur 4 postes de consommations (Haute Saison Heures Creuses/Heures Pleines et Basse saison Heures Creuses/Heures Pleines)',
    segment: 'C5',
    timeSlots: 4,
    voltage: 'BTinf',
    type: 'HP_HC_SEASONAL'
  },

  BTINFMU4: {
    code: 'BTINFMU4',
    name: 'BT INF Moyennes Utilisations 4 postes',
    description: 'Sites ayant une puissance inférieure à 36kVA en Moyennes Utilisations et sur 4 postes de consommations (Haute Saison Heures Creuses/Heures Pleines et Basse saison Heures Creuses/Heures Pleines)',
    segment: 'C5',
    timeSlots: 4,
    voltage: 'BTinf',
    type: 'HP_HC_SEASONAL'
  },

  // Basse Tension Supérieure (36-250kW) - Segment C4
  BTSUPCU4: {
    code: 'BTSUPCU4',
    name: 'BT SUP Courtes Utilisations 4 postes',
    description: 'Sites ayant une puissance supérieure à 36kVA et inférieure à 250 kW en Courtes Utilisations et sur 4 postes de consommations (Heures Creuses Hiver/Heures Pleines Hiver et Heures Creuses Été/Heures Pleines Été)',
    segment: 'C4',
    timeSlots: 4,
    voltage: 'BTsup',
    type: 'HP_HC_SEASONAL'
  },

  BTSUPLU4: {
    code: 'BTSUPLU4',
    name: 'BT SUP Longues Utilisations 4 postes',
    description: 'Sites ayant une puissance supérieure à 36kVA et inférieure à 250 kW en Longues Utilisations et sur 4 postes de consommations (Heures Creuses Hiver/Heures Pleines Hiver et Heures Creuses Été/Heures Pleines Été)',
    segment: 'C4',
    timeSlots: 4,
    voltage: 'BTsup',
    type: 'HP_HC_SEASONAL'
  }
};

/**
 * Obtenir les informations d'une formule tarifaire par son code
 */
export function getContractFormulaInfo(code: string): ContractFormula | null {
  return CONTRACT_FORMULAS[code] || null;
}

/**
 * Obtenir le nombre de cadrans/postes de consommation pour un code
 */
export function getTimeSlots(code: string): number {
  const formula = CONTRACT_FORMULAS[code];
  return formula ? formula.timeSlots : 1; // Par défaut 1 si non trouvé
}

/**
 * Déterminer si le contrat a des tarifs saisonniers
 */
export function hasSeasonal(code: string): boolean {
  const formula = CONTRACT_FORMULAS[code];
  return formula ? formula.type === 'HP_HC_SEASONAL' : false;
}

/**
 * Obtenir une description lisible du type de tarification
 */
export function getTariffDescription(code: string): string {
  const formula = CONTRACT_FORMULAS[code];
  if (!formula) return 'Tarif non identifié';

  switch (formula.timeSlots) {
    case 1:
      return 'Tarif Base (1 cadran)';
    case 2:
      return 'Tarif HP/HC (2 cadrans)';
    case 4:
      if (formula.type === 'HP_HC_SEASONAL') {
        return 'Tarif HP/HC Saisonnier (4 cadrans)';
      }
      return 'Tarif Multi-horaires (4 cadrans)';
    default:
      return `${formula.timeSlots} cadrans`;
  }
}
