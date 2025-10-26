# Guide de Test - API Switchgrid C68

## 🎯 Objectif

Tester la récupération des données de contrat (C68) via l'API Switchgrid après les corrections apportées.

## 📋 Prérequis

1. Avoir un compte Switchgrid avec un token d'API valide
2. Avoir un PRM (Point de Référence et de Mesure) de compteur
3. Avoir obtenu le consentement (étapes 1 et 2 déjà fonctionnelles)

## 🚀 Déploiement de l'Edge Function

Avant de tester, déployez la version corrigée de l'edge function :

```bash
npx supabase functions deploy switchgrid-orders
```

Vous devriez voir :
```
✓ Deployed Function switchgrid-orders on project [votre-projet]
```

## 🧪 Méthode de Test 1 : Via l'Interface Web

### Étape 1 : Accéder à la page Switchgrid
1. Démarrez l'application : `npm run dev`
2. Naviguez vers la page Switchgrid

### Étape 2 : Rechercher un contrat (déjà fonctionnel)
1. Remplissez le nom et l'adresse
2. Cliquez sur "Rechercher"
3. Sélectionnez le contrat trouvé

### Étape 3 : Obtenir le consentement (déjà fonctionnel)
1. Générez le formulaire de consentement
2. Signez-le (ou utilisez un consentement existant)
3. Attendez que le statut passe à "Accepté"

### Étape 4 : Commander les données C68 (NOUVELLE FONCTIONNALITÉ CORRIGÉE)
1. **Sélectionnez uniquement** la case "Détails du contrat (C68)"
2. Cliquez sur "Commander les données sélectionnées (1)"
3. Observez les logs dans la console du navigateur (F12)

### Étape 5 : Vérifier les logs

Dans la console, vous devriez voir :

```
📊 Commande de données sélectionnées: ...
✅ Order created successfully: [order-id]
🔑 PRM ajouté aux paramètres pour C68: [votre-prm]
📈 Récupération données requête: [request-id] Type: C68
✅ Données récupérées avec succès à la tentative 1
📦 Full raw data for C68: { ... }
✅ Données C68 récupérées
```

### Étape 6 : Vérifier l'affichage

Une fois les données récupérées, vous devriez voir :
- ✅ Un badge vert "SUCCESS" pour la requête C68
- 📥 Un bouton "Télécharger" pour exporter les données en JSON

## 🧪 Méthode de Test 2 : Via le Script Node.js

Si vous avez déjà un `requestId` et un `prm`, vous pouvez tester directement :

### 1. Éditer le fichier de test

Ouvrez `test-c68-api.js` et modifiez :

```javascript
const TEST_CONFIG = {
  requestId: '1234-5678-90ab-cdef', // Votre request ID
  prm: '00059461297239',             // Votre PRM
};
```

### 2. Exécuter le test

```bash
node test-c68-api.js
```

### 3. Résultat attendu

```
🧪 Test de récupération des données C68
==================================================

📊 Configuration:
  - Request ID: 1234-5678-90ab-cdef
  - PRM: 00059461297239
  - Supabase URL: https://[votre-projet].supabase.co
  - Edge Function: switchgrid-orders

📡 Appel de l'edge function...

📥 Réponse reçue:
  - Status: 200 OK
  - Content-Type: application/json

✅ Données C68 récupérées avec succès!

📦 Données du contrat:
{
  "prm": "00059461297239",
  "address": "...",
  "formule_tarifaire_acheminement": "...",
  ...
}

✅ Test réussi!
```

## 🔍 Debugging

### Si vous obtenez une erreur 400

**Vérifiez :**
- Le `requestId` est correct
- Le `prm` (PRM) est bien passé dans les paramètres
- Le type de requête est bien `C68`

**Dans les logs de l'edge function (Supabase Dashboard > Edge Functions > Logs) :**
```
🔑 PRM ajouté aux paramètres pour C68: [votre-prm]
🌐 Full Request URL: https://app.switchgrid.tech/enedis/v2/request/[id]/data?prm=***&format=json
```

### Si vous obtenez une erreur 404

Le `requestId` n'existe pas ou n'est plus valide. Recommencez depuis l'étape 4 (Commander les données).

### Si les données sont vides

Vérifiez que :
1. La requête C68 a bien le statut "SUCCESS" (pas "PENDING" ou "FAILED")
2. Le PRM correspond bien au compteur du contrat
3. L'edge function est bien déployée avec les dernières modifications

## 📊 Données C68 attendues

Les données C68 devraient contenir :

```json
{
  "prm": "00059461297239",
  "address": "...",
  "formule_tarifaire_acheminement": "BTINF",
  "puissance_souscrite": 9,
  "calendrier_distributeur": "BASE ou HC",
  "date_mise_en_service": "...",
  "segment_client": "...",
  ...
}
```

## ✅ Critères de Succès

Le test est réussi si :

1. ✅ La commande C68 est créée (statut "CREATED" puis "SUCCESS")
2. ✅ Les données sont récupérées sans erreur 400
3. ✅ Le JSON retourné contient les informations du contrat
4. ✅ Dans les logs, on voit : `🔑 PRM ajouté aux paramètres pour C68`
5. ✅ Le bouton "Télécharger" permet d'exporter les données

## 🎉 Prochaines Étapes

Une fois le C68 fonctionnel, vous pouvez tester les autres types de données :

- **R65** : Consommation quotidienne
- **R66** : Puissances maximales
- **Courbe de charge** : Données de consommation détaillées

Ces requêtes suivent le même pattern mais n'ont pas besoin du paramètre `prm` dans l'URL de récupération des données.

## 📞 Support

En cas de problème :

1. Vérifiez les logs dans la console du navigateur (F12)
2. Vérifiez les logs de l'edge function dans le dashboard Supabase
3. Consultez le fichier `SWITCHGRID_C68_FIX.md` pour plus de détails techniques
