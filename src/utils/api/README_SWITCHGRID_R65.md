# Guide d'utilisation - Switchgrid R65 API

## Vue d'ensemble

L'API R65 permet de récupérer les données de consommation (soutirage) depuis Switchgrid via l'Edge Function `switchgrid-r65`.

Cette fonction utilise un pattern simple et éprouvé, inspiré du code de l'équipe Switchgrid.

## Méthode recommandée (Simple et rapide)

### Option 1: Obtenir directement les rows parsées

```typescript
import { createR65Order } from '@/utils/api/switchgridR65Api';

// Récupérer les données de consommation
const result = await createR65Order({
  prm: "14862373311505",
  consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
  start_date: "2025-01-01",
  end_date: "2025-10-10",
  returnRows: true  // ← Par défaut true, renvoie directement { count, rows }
});

// result.rows est directement utilisable
console.log(`Reçu ${result.count} enregistrements`);
result.rows.forEach(row => {
  console.log(`${row.date}: ${row.energy_total_kwh} kWh`);

  // Pour les contrats multi-cadrans (HP/HC, etc.)
  if (row.energy_by_cadran) {
    console.log('Détail par cadran:', row.energy_by_cadran);
    // { BASE: 5.2 } ou { HP: 3.5, HC: 1.7 }
  }
});
```

### Structure des données retournées

```typescript
interface R65Row {
  date: string;              // Format: "2025-01-15"
  energy_total_kwh: number;  // Total du jour en kWh
  energy_by_cadran?: {       // Optionnel: détail par tarif
    BASE?: number;           // Pour tarif Base
    HP?: number;             // Heures Pleines
    HC?: number;             // Heures Creuses
    // Autres cadrans possibles selon le contrat
  };
}

interface R65OrderResponse {
  success: boolean;
  count: number;
  rows: R65Row[];
}
```

## Option 2: Méthode en deux temps (avancé)

Si vous avez besoin du `dataUrl` pour un usage spécifique:

### Étape A: Créer la commande

```typescript
import { createR65Order } from '@/utils/api/switchgridR65Api';

const order = await createR65Order({
  prm: "14862373311505",
  consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
  start_date: "2025-01-01",
  end_date: "2025-10-10",
  returnRows: false  // ← Retourne juste le dataUrl
});

console.log('Data URL:', order.dataUrl);
```

### Étape B: Fetch via proxy avec parsing

```typescript
import { fetchR65DataFromUrl } from '@/utils/api/switchgridR65Api';

const data = await fetchR65DataFromUrl(
  order.dataUrl,
  true  // ← parse=true pour avoir les rows prêtes
);

console.log(`Reçu ${data.count} enregistrements`);
data.rows.forEach(row => {
  console.log(`${row.date}: ${row.energy_total_kwh} kWh`);
});
```

## Gestion des périodes

### Dernière année glissante

```typescript
const now = new Date();
const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
const startDate = new Date(endDate);
startDate.setFullYear(startDate.getFullYear() - 1);
startDate.setDate(1);

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const result = await createR65Order({
  prm: "14862373311505",
  consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
  start_date: formatDate(startDate),  // Ex: "2024-01-01"
  end_date: formatDate(endDate),      // Ex: "2024-12-31"
  returnRows: true
});
```

### Année civile complète

```typescript
const year = 2024;
const result = await createR65Order({
  prm: "14862373311505",
  consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
  start_date: `${year}-01-01`,
  end_date: `${year}-12-31`,
  returnRows: true
});
```

## Gestion des erreurs

```typescript
try {
  const result = await createR65Order({
    prm: "14862373311505",
    consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
    start_date: "2025-01-01",
    end_date: "2025-10-10",
    returnRows: true
  });

  if (!result.rows || result.rows.length === 0) {
    console.warn('Aucune donnée disponible pour cette période');
  }

} catch (error) {
  console.error('Erreur lors de la récupération des données:', error);
}
```

## Utilisation dans les graphiques

```typescript
import { createR65Order } from '@/utils/api/switchgridR65Api';

const loadConsumptionData = async () => {
  const result = await createR65Order({
    prm: myPrm,
    consent_id: myConsentId,
    start_date: "2025-01-01",
    end_date: "2025-10-10",
    returnRows: true
  });

  // Formater pour Recharts
  const chartData = result.rows.map(row => ({
    date: new Date(row.date).toLocaleDateString('fr-FR'),
    consommation: row.energy_total_kwh
  }));

  return chartData;
};
```

## Notes importantes

1. **CORS**: L'Edge Function gère automatiquement les problèmes CORS
2. **Polling**: L'Edge Function attend automatiquement que les données soient prêtes
3. **Parsing**: Avec `returnRows: true`, les données sont déjà parsées et formatées
4. **Performance**: Option 1 (direct) = 1 seul appel réseau vs Option 2 = 2 appels

## Migration depuis l'ancienne API

```typescript
// ❌ ANCIEN CODE
const result = await createR65YearOrder({
  prm,
  consent_id: consentId
});

// ✅ NOUVEAU CODE
const result = await createR65Order({
  prm,
  consent_id: consentId,
  start_date: "2024-01-01",
  end_date: "2024-12-31",
  returnRows: true
});
```
