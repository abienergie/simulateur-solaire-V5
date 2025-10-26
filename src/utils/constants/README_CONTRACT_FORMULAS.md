# Référence des Formules Tarifaires Enedis

## Vue d'ensemble

Ce module fournit une base de données complète des codes de formules tarifaires Enedis avec leurs caractéristiques.

## Utilisation

```typescript
import {
  getContractFormulaInfo,
  getTimeSlots,
  hasSeasonal,
  getTariffDescription
} from '@/utils/constants/contractFormulas';

// Obtenir toutes les informations d'une formule
const info = getContractFormulaInfo('BTINFMU4');
// {
//   code: 'BTINFMU4',
//   name: 'BT INF Moyennes Utilisations 4 postes',
//   timeSlots: 4,
//   voltage: 'BTinf',
//   type: 'HP_HC_SEASONAL',
//   ...
// }

// Obtenir juste le nombre de cadrans
const cadrans = getTimeSlots('BTINFMU4'); // 4

// Vérifier si c'est un tarif saisonnier
const isSeasonal = hasSeasonal('BTINFMU4'); // true

// Obtenir une description lisible
const desc = getTariffDescription('BTINFMU4'); // "Tarif HP/HC Saisonnier (4 cadrans)"
```

## Codes disponibles

### Basse Tension Inférieure (<36kVA) - Segment C5

| Code | Cadrans | Type |
|------|---------|------|
| BTINFCUST | 1 | Base |
| BTINFMUDT | 2 | HP/HC |
| BTINFLU | 1 | Longues Utilisations |
| BTINFCU4 | 4 | HP/HC Saisonnier |
| BTINFMU4 | 4 | HP/HC Saisonnier |

### Basse Tension Supérieure (36-250kW) - Segment C4

| Code | Cadrans | Type |
|------|---------|------|
| BTSUPCU4 | 4 | HP/HC Saisonnier (Hiver/Été) |
| BTSUPLU4 | 4 | HP/HC Saisonnier (Hiver/Été) |

## Nombre de cadrans

Le nombre de cadrans correspond au nombre de postes de consommation différents dans l'année:

- **1 cadran**: Tarif unique toute l'année (Base)
- **2 cadrans**: Heures Pleines / Heures Creuses
- **4 cadrans**:
  - Soit HP/HC Haute Saison + HP/HC Basse Saison
  - Soit HP/HC Hiver + HP/HC Été

## Exemple d'utilisation dans le code

Voir `ContractDetailsDisplay.tsx` pour un exemple d'intégration complète.
