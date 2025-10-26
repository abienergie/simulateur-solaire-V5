# Switchgrid R65 Edge Function

## Description

Cette Edge Function permet de récupérer les données de consommation (soutirage) R65 depuis l'API Switchgrid.

## Fonctionnalités

- Création d'ordre R65_SYNC
- Polling automatique jusqu'à SUCCESS
- Parsing des données en format standardisé
- Support de 2 actions: `create_r65_order_and_poll` et `fetch_data_url`

## Configuration requise

### Variable d'environnement

La fonction nécessite la variable suivante:
- `SWITCHGRID_API_KEY` : Votre clé API Switchgrid

## Déploiement

Pour déployer cette fonction sur Supabase:

```bash
supabase functions deploy switchgrid-r65
```

Ou via l'interface Claude Code:

```typescript
// La fonction est déployée automatiquement via l'outil mcp__supabase__deploy_edge_function
```

## Utilisation

### Option 1: Récupération directe (recommandé)

```typescript
const response = await fetch('/functions/v1/switchgrid-r65', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create_r65_order_and_poll',
    prm: '14862373311505',
    consent_id: '334be8a8-a600-4d09-b0ec-ea034a5be41d',
    start_date: '2025-01-01',
    end_date: '2025-10-10',
    returnRows: true
  })
});

const data = await response.json();
// data.rows contient les données parsées
```

### Option 2: En deux temps

**Étape A - Créer l'ordre:**

```typescript
const orderResponse = await fetch('/functions/v1/switchgrid-r65', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create_r65_order_and_poll',
    prm: '14862373311505',
    consent_id: '334be8a8-a600-4d09-b0ec-ea034a5be41d',
    start_date: '2025-01-01',
    end_date: '2025-10-10',
    returnRows: false
  })
});

const { dataUrl } = await orderResponse.json();
```

**Étape B - Récupérer les données:**

```typescript
const dataResponse = await fetch('/functions/v1/switchgrid-r65', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'fetch_data_url',
    dataUrl: dataUrl,
    parse: true
  })
});

const data = await dataResponse.json();
// data.rows contient les données parsées
```

## Format de réponse

```typescript
{
  success: true,
  orderId: "abc123",
  requestId: "req456",
  count: 365,
  rows: [
    {
      date: "2025-01-15",
      energy_total_kwh: 5.234,
      energy_by_cadran: {
        BASE: 5.234
      }
    },
    // ...
  ],
  period: {
    start: "2025-01-01",
    end: "2025-10-10"
  }
}
```

## Gestion des erreurs

La fonction renvoie des erreurs claires avec:
- `error`: Message d'erreur
- `details`: Détails supplémentaires si disponibles
- `status`: Code HTTP approprié

Exemples:
- 400: Paramètres manquants
- 401: API key invalide
- 500: Erreur interne

## Architecture

1. **Création d'ordre**: POST vers `/enedis/v2/order` avec type `R65_SYNC`
2. **Polling**: Vérifie le statut toutes les 2 secondes (max 45 tentatives = 90 secondes)
3. **Récupération**: Fetch du `dataUrl` fourni par Switchgrid
4. **Parsing**: Conversion du format Switchgrid vers format standardisé

## Logs

La fonction log toutes les étapes importantes:
- 📨 Requête reçue
- 📦 Body de la requête
- 📅 Période demandée
- 📤 Création d'ordre
- ✅ Ordre créé
- ⏳ Polling en cours
- 📥 Récupération des données
- 🔧 Parsing
- ✅ Succès final

Consultez les logs dans le dashboard Supabase pour debugger.

## Inspiré de

Cette implémentation est basée sur le pattern simple et efficace fourni par l'équipe Switchgrid.
