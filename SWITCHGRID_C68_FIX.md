# Fix pour la récupération des données C68 (Détails du contrat)

## Problème identifié

L'API Switchgrid pour récupérer les données C68 (détails du contrat) nécessite que le **PRM (Point de Référence et de Mesure)** soit passé comme paramètre d'URL lors de la récupération des données via l'endpoint `/request/{requestId}/data`.

## Solution implémentée

### 1. Modification de l'Edge Function (`supabase/functions/switchgrid-orders/index.ts`)

**Changements apportés :**

- Ajout d'un nouveau paramètre `requestType` dans l'action `get_request_data`
- Logique conditionnelle pour ajouter le PRM aux paramètres d'URL uniquement pour les requêtes C68

```typescript
// Ligne ~686-717
const requestType = body?.requestType;  // Nouveau paramètre

// IMPORTANT: Pour C68, le PRM doit être passé comme paramètre d'URL
if (params.prm && (requestType === 'C68' || requestType === 'C68_ASYNC')) {
  searchParams.set('prm', params.prm);
  console.log('🔑 PRM ajouté aux paramètres pour C68:', params.prm);
}
```

### 2. Modification du composant DataRetrieval (`src/components/switchgrid/DataRetrieval.tsx`)

**Changements apportés :**

- La fonction `fetchRequestDataWithRetry` prend maintenant un paramètre `requestType`
- Ce type est passé à `getRequestData` pour permettre à l'edge function de savoir comment traiter la requête

```typescript
// Ligne ~209-235
const fetchRequestDataWithRetry = async (
  requestId: string,
  requestType: string,  // Nouveau paramètre
  params: any,
  maxRetries = 3,
  delayMs = 2000
): Promise<any> => {
  // ...
  const data = await getRequestData(requestId, requestType, params);
  // ...
}
```

- Mise à jour de l'appel dans `processOrderData` :

```typescript
// Ligne ~261
const requestData = await fetchRequestDataWithRetry(request.id, request.type, params);
```

- Mise à jour de l'appel dans `handleDownloadRequestData` :

```typescript
// Ligne ~393-396
const requestData = await getRequestData(requestStatus.id, requestType, params);
```

### 3. Modification du hook useSwitchgrid (`src/hooks/useSwitchgrid.ts`)

**Changements apportés :**

- La fonction `getRequestData` prend maintenant un paramètre `requestType`
- Ce type est transmis à l'edge function

```typescript
// Ligne ~207-256
const getRequestData = useCallback(async (
  requestId: string,
  requestType: string,  // Nouveau paramètre
  params?: { ... }
) => {
  // ...
  const { data, error } = await supabase.functions.invoke('switchgrid-orders', {
    method: 'POST',
    body: {
      action: 'get_request_data',
      requestId: requestId,
      requestType: requestType,  // Passé à l'edge function
      params: params || {}
    }
  });
  // ...
}, []);
```

## Comment l'API fonctionne maintenant

### Étape 1 : Créer l'order
```json
POST /order
{
  "consentId": "uuid-du-consent",
  "requests": [
    {
      "type": "C68",
      "prms": ["00059461297239"]
    }
  ]
}
```

### Étape 2 : Vérifier le statut
```json
GET /order/{orderId}
```

Réponse :
```json
{
  "id": "order-id",
  "status": "CREATED",
  "requests": [
    {
      "id": "request-id-c68",
      "type": "C68",
      "status": "SUCCESS",
      "dataUrl": "https://example.com/data.json"
    }
  ]
}
```

### Étape 3 : Récupérer les données C68
```
GET /request/{request-id-c68}/data?prm=00059461297239&format=json
```

**IMPORTANT :** Le paramètre `prm` est obligatoire pour les requêtes C68 !

## Déploiement

Pour déployer les changements :

```bash
# Depuis le terminal, à la racine du projet
npx supabase functions deploy switchgrid-orders
```

## Tests recommandés

1. **Test C68 seul :**
   - Sélectionner uniquement "Détails du contrat (C68)"
   - Commander les données
   - Vérifier que les données du contrat sont bien récupérées

2. **Test C68 + autres données :**
   - Sélectionner C68 + R65 (consommation quotidienne)
   - Vérifier que toutes les données sont récupérées correctement

3. **Vérifier les logs :**
   - Dans la console du navigateur, chercher les messages :
     - `🔑 PRM ajouté aux paramètres pour C68: ...`
     - `✅ Données récupérées avec succès`

## Référence documentation Switchgrid

D'après le document "Explication ABI Energie.pdf" :

> **3. Ordering consumption data:**
> - Once the user has given their consent via an Ask, we can request data associated to a meter, via the POST /order endpoint
> - To check the status of the requests, we use the GET /order/{orderId} endpoint
> - For the requests that are different than the loadcurve, when the status is success we will have a link to the data. It is the dataUrl object

Et pour récupérer les données, le paramètre PRM est nécessaire pour les requêtes C68.
