# Déploiement de la fonction R65

## Prérequis

La variable d'environnement suivante doit être configurée dans Supabase:
- `SWITCHGRID_API_KEY` : Votre clé API Switchgrid

## Méthode 1: Via Claude Code (Recommandé)

Demandez à Claude Code de déployer la fonction:

```
Déploie la fonction switchgrid-r65 sur Supabase
```

Claude utilisera automatiquement l'outil `mcp__supabase__deploy_edge_function`.

## Méthode 2: Via CLI Supabase

```bash
supabase functions deploy switchgrid-r65
```

## Vérification du déploiement

Testez la fonction avec curl:

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/switchgrid-r65' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "create_r65_order_and_poll",
    "prm": "14862373311505",
    "consent_id": "334be8a8-a600-4d09-b0ec-ea034a5be41d",
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "returnRows": true
  }'
```

## Architecture de la fonction

### Fichiers
- `index.ts` : Code principal de la fonction
- `deno.json` : Configuration des imports
- `README.md` : Documentation de la fonction

### Flow
1. Reçoit la requête avec `prm`, `consent_id`, dates
2. Crée un ordre R65_SYNC via API Switchgrid
3. Poll le statut toutes les 2s (max 90s)
4. Récupère les données du `dataUrl`
5. Parse et retourne les rows

### Points clés
- **Simple**: Pas de Supabase storage, parsing direct
- **Robuste**: Gestion d'erreur complète, logs détaillés
- **CORS**: Headers configurés correctement
- **Timeout**: 90 secondes max pour le polling

## Utilisation côté frontend

Le code frontend est déjà configuré dans:
- `src/utils/api/switchgridR65Api.ts`
- `src/components/switchgrid/DataRetrieval.tsx`

Exemple d'utilisation:

```typescript
import { createR65Order } from '@/utils/api/switchgridR65Api';

const result = await createR65Order({
  prm: "14862373311505",
  consent_id: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
  start_date: "2025-01-01",
  end_date: "2025-10-10",
  returnRows: true
});

console.log(`Reçu ${result.count} enregistrements`);
result.rows.forEach(row => {
  console.log(`${row.date}: ${row.energy_total_kwh} kWh`);
});
```

## Troubleshooting

### Erreur 401: API key not configured
- Vérifiez que `SWITCHGRID_API_KEY` est bien configurée dans Supabase
- Dashboard > Settings > Edge Functions > Secrets

### Timeout
- Le polling attend max 90 secondes
- Si l'ordre prend plus de temps, augmentez `maxAttempts` dans `pollOrder()`

### Parsing error
- Vérifiez les logs dans le dashboard Supabase
- La fonction log les `grandeur` disponibles si elle ne trouve pas CONS

### CORS error
- La fonction gère déjà les CORS automatiquement
- Si problème persiste, vérifiez les headers dans les logs
