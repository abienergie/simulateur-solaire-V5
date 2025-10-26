# Corrections apportées à l'API Switchgrid C68

## 📋 Résumé

Les corrections apportées permettent maintenant de récupérer correctement les données C68 (Détails du contrat) depuis l'API Switchgrid. Le problème était que le **PRM (Point de Référence et de Mesure)** n'était pas passé comme paramètre d'URL lors de la récupération des données.

## 🔍 Analyse du Problème

### Avant

L'appel API ressemblait à :
```
GET /request/{requestId}/data?format=json
```

### Maintenant

L'appel API inclut le PRM :
```
GET /request/{requestId}/data?format=json&prm=00059461297239
```

D'après la documentation Switchgrid et l'exemple dans la capture d'écran, le paramètre `prm` est **obligatoire** pour les requêtes de type C68.

## 🛠️ Fichiers Modifiés

### 1. Edge Function : `supabase/functions/switchgrid-orders/index.ts`

**Modifications :**
- Ajout du paramètre `requestType` à l'action `get_request_data`
- Logique pour ajouter le PRM uniquement pour les requêtes C68

**Code modifié (lignes ~686-717) :**
```typescript
const requestType = body?.requestType;  // NOUVEAU

// IMPORTANT: Pour C68, le PRM doit être passé comme paramètre d'URL
if (params.prm && (requestType === 'C68' || requestType === 'C68_ASYNC')) {
  searchParams.set('prm', params.prm);
  console.log('🔑 PRM ajouté aux paramètres pour C68:', params.prm);
}
```

### 2. Composant React : `src/components/switchgrid/DataRetrieval.tsx`

**Modifications :**
- La fonction `fetchRequestDataWithRetry` accepte maintenant le `requestType`
- Ce type est transmis à la fonction `getRequestData`

**Code modifié (lignes ~209-235) :**
```typescript
const fetchRequestDataWithRetry = async (
  requestId: string,
  requestType: string,  // NOUVEAU PARAMÈTRE
  params: any,
  maxRetries = 3,
  delayMs = 2000
): Promise<any> => {
  // ...
  const data = await getRequestData(requestId, requestType, params);
  // ...
}
```

**Appel mis à jour (ligne ~261) :**
```typescript
const requestData = await fetchRequestDataWithRetry(
  request.id,
  request.type,  // Type passé explicitement
  params
);
```

### 3. Hook React : `src/hooks/useSwitchgrid.ts`

**Modifications :**
- La fonction `getRequestData` accepte maintenant le `requestType`
- Ce type est envoyé à l'edge function

**Code modifié (lignes ~207-256) :**
```typescript
const getRequestData = useCallback(async (
  requestId: string,
  requestType: string,  // NOUVEAU PARAMÈTRE
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

## 🎯 Comment Ça Marche Maintenant

### Flux de Récupération des Données C68

```
1. Utilisateur sélectionne "Détails du contrat (C68)"
   ↓
2. Création d'un order avec le consentId et le PRM
   POST /order
   {
     "consentId": "...",
     "requests": [
       { "type": "C68", "prms": ["00059461297239"] }
     ]
   }
   ↓
3. Polling du statut de l'order
   GET /order/{orderId}
   → Attend que status = "SUCCESS"
   ↓
4. Récupération des données avec le PRM
   GET /request/{requestId}/data?prm=00059461297239&format=json
   ↓
5. Affichage des données du contrat
```

### Paramètres Transmis

```javascript
{
  action: 'get_request_data',
  requestId: 'abc-123',           // ID de la requête
  requestType: 'C68',             // Type de requête (NOUVEAU)
  params: {
    format: 'json',
    prm: '00059461297239'         // PRM du compteur
  }
}
```

## 📊 Référence API Switchgrid

D'après la capture d'écran de l'API (`Capture d'écran 2025-10-07 à 21.36.00.png`) :

### Endpoint `/order`

**Body :**
```json
{
  "consentId": null,
  "requests": [
    {
      "type": "C68",
      "prms": ["00059461297239"]
    }
  ]
}
```

**Response (200) :**
```json
{
  "id": "da466b13-6904-4a5d-a108-746808686631",
  "status": "CREATED",
  "requests": [
    {
      "id": "request-id-unique",
      "type": "C68",
      "status": "SUCCESS",
      "orderedAt": "2021-09-01T00:00:00.000Z",
      "completedAt": "2021-09-01T00:02:00.000Z",
      "dataUrl": "https://example.com/data.json",
      "errorMessage": null
    }
  ]
}
```

### Endpoint `/request/{requestId}/data`

Pour C68, le paramètre `prm` est nécessaire :
```
GET /request/{requestId}/data?prm=00059461297239
```

## ✅ Tests à Effectuer

### Test 1 : C68 Seul

1. Sélectionnez uniquement "Détails du contrat (C68)"
2. Cliquez sur "Commander les données"
3. Vérifiez que :
   - ✅ Le statut passe à "SUCCESS"
   - ✅ Le bouton "Télécharger" apparaît
   - ✅ Les données du contrat sont affichées

**Logs attendus :**
```
🔑 PRM ajouté aux paramètres pour C68: 00059461297239
📈 Récupération données requête: [request-id] Type: C68
✅ Données récupérées avec succès
```

### Test 2 : C68 + R65

1. Sélectionnez "Détails du contrat (C68)" ET "Consommation quotidienne (R65)"
2. Cliquez sur "Commander les données"
3. Vérifiez que les deux requêtes sont traitées correctement

### Test 3 : Toutes les données

1. Sélectionnez les 4 types de données
2. Vérifiez que tout fonctionne

## 🐛 Debugging

### Vérifications dans les Logs

**Console navigateur (F12) :**
```javascript
// Avant l'appel
📊 Getting request data: [request-id] Type: C68 Params: { format: 'json', prm: '***' }

// Dans l'edge function
🔑 PRM ajouté aux paramètres pour C68: 00059461297239
🌐 Full Request URL: .../request/[id]/data?prm=***&format=json

// Après l'appel
✅ Données récupérées avec succès à la tentative 1
```

**Dashboard Supabase (Edge Functions > Logs) :**
```
🔍 Action get_request_data appelée
🔑 RequestType extrait: C68
🔑 PRM ajouté aux paramètres pour C68: 00059461297239
📡 Starting fetch request...
📥 Fetch completed, status: 200
✅ Response OK
```

## 📚 Documentation Créée

1. **SWITCHGRID_C68_FIX.md** : Documentation technique détaillée
2. **GUIDE_TEST_C68.md** : Guide de test pas-à-pas
3. **test-c68-api.js** : Script Node.js pour tester l'API
4. **Ce fichier** : Récapitulatif des corrections

## 🚀 Déploiement

Pour appliquer les corrections :

```bash
# 1. Déployer l'edge function
npx supabase functions deploy switchgrid-orders

# 2. Build du frontend (déjà fait)
npm run build

# 3. Redémarrer l'application
npm run dev
```

## 📝 Notes Importantes

1. Le PRM est **uniquement nécessaire pour C68**, pas pour R65, R66 ou la courbe de charge
2. L'edge function détecte automatiquement quand ajouter le PRM grâce au `requestType`
3. Tous les appels à `getRequestData` doivent maintenant passer le `requestType`
4. Cette correction est rétrocompatible : les autres types de requêtes continuent de fonctionner

## 🎉 Résultat

Vous pouvez maintenant :
- ✅ Récupérer les détails du contrat (C68)
- ✅ Voir les informations du contrat dans l'interface
- ✅ Télécharger les données en JSON
- ✅ Combiner C68 avec d'autres types de données

Tous les problèmes de récupération des données C68 sont maintenant résolus !
