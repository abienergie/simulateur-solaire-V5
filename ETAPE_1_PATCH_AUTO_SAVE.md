# 🔧 Patch Étape 1 - Sauvegarde automatique

## ❌ Problème identifié

Les tables étaient créées mais restaient vides car **le composant front n'appelait pas l'action `save_order_data`**.

L'erreur dans les logs était due au fait que l'Edge Function était bien déployée, mais jamais invoquée pour sauvegarder les données.

## ✅ Solution appliquée

J'ai modifié 2 fichiers pour activer la sauvegarde automatique :

### 1. Hook `useSwitchgrid.ts` - Ajout fonction `saveOrderData`

**Fichier :** `src/hooks/useSwitchgrid.ts`

**Ajout :**
- Nouvelle fonction `saveOrderData()` qui appelle l'Edge Function avec l'action `save_order_data`
- Export de cette fonction dans le hook

```typescript
const saveOrderData = useCallback(async (
  pdl: string,
  orderData: OrderResponse,
  allRequestsData: any
) => {
  // Appelle l'Edge Function avec action: 'save_order_data'
  const { data, error } = await supabase.functions.invoke('switchgrid-orders', {
    method: 'POST',
    body: {
      action: 'save_order_data',
      pdl: pdl,
      orderData: orderData,
      allRequestsData: allRequestsData
    }
  });
  // ...
}, []);
```

### 2. Composant `DataRetrieval.tsx` - Appel automatique après récupération

**Fichier :** `src/components/switchgrid/DataRetrieval.tsx`

**Modifications :**
1. Import de `saveOrderData` depuis le hook
2. Appel automatique après `setRetrievedData(data)`

```typescript
// Sauvegarder les données dans Supabase
try {
  const prm = ask.contracts[0]?.prm;
  if (prm && Object.keys(data).length > 0) {
    console.log('💾 Début sauvegarde dans Supabase...');
    const saveResult = await saveOrderData(prm, order, data);
    console.log('✅ Sauvegarde réussie:', saveResult.stats);
  }
} catch (saveError) {
  console.warn('⚠️ Erreur lors de la sauvegarde:', saveError);
  // Ne pas bloquer l'affichage si la sauvegarde échoue
}
```

## 🚀 Nouvelle procédure de test

### 1. Rebuild le projet (si nécessaire)

```bash
npm run build
```

✅ **Déjà vérifié : le build passe sans erreur**

### 2. Tester une récupération Switchgrid

1. Ouvrir l'application
2. Aller sur la page **Switchgrid**
3. Faire une récupération de données complète
4. **NOUVEAU** : Observer les logs dans la console :

```
✅ Données traitées: contractDetails, consumption, loadCurve, maxPower
💾 Début sauvegarde dans Supabase...
✅ Sauvegarde réussie: { consumption: 365, production: 0, ... }
```

### 3. Vérifier dans Supabase

```sql
-- Compter les données sauvegardées
SELECT
  (SELECT COUNT(*) FROM switchgrid_contract_details) as contracts,
  (SELECT COUNT(*) FROM switchgrid_consumption_daily) as consumption_days,
  (SELECT COUNT(*) FROM switchgrid_max_power) as max_power_days,
  (SELECT COUNT(*) FROM switchgrid_load_curve) as load_curve_points;
```

Tu devrais maintenant voir des données !

## 📊 Statistiques retournées

Après chaque sauvegarde réussie, tu verras dans les logs :

```javascript
{
  consumption: 365,           // Nombre de jours de consommation
  production: 0,              // Nombre de jours de production (si PV)
  consumptionMaxPower: 365,   // Nombre de jours de puissance max
  productionMaxPower: 0,      // Nombre de jours de puissance max prod
  consumptionLoadCurve: 4320, // Nombre de points de courbe de charge
  productionLoadCurve: 0,     // Nombre de points de courbe prod
  contract: 1                 // 1 si contrat sauvegardé
}
```

## 🔍 Logs à surveiller

### Dans la console navigateur :

```
✅ Données traitées: contractDetails, consumption, loadCurve, maxPower
💾 Début sauvegarde dans Supabase...
✅ Sauvegarde réussie: { ... stats ... }
```

### Dans Supabase Edge Functions logs :

```
💾 Starting Supabase save for PDL: 14862373311505 User: xxx-xxx-xxx
📊 Tariff detected: HP_HC Formula: BTINF_HC
✅ Contract saved
✅ Consumption saved: 365 rows
✅ Max power saved: 365 rows
✅ Load curve saved: 4320 rows
📊 Final stats: { consumption: 365, ... }
```

## ⚠️ Si ça ne marche toujours pas

### 1. Vérifier l'authentification

Assure-toi d'être connecté à Supabase. La fonction `save_order_data` nécessite un token d'authentification.

```javascript
// Vérifier dans la console
supabase.auth.getSession().then(console.log)
```

### 2. Vérifier les logs Edge Function

Dans Supabase Dashboard → Edge Functions → switchgrid-orders → Logs

Chercher les erreurs `❌` et me les communiquer.

### 3. Vérifier les RLS policies

```sql
-- Vérifier les policies sur une table
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'switchgrid_consumption_daily';
```

## ✅ Validation

L'Étape 1 est **réussie** quand :

- [x] Build passe sans erreur ✅
- [x] Hook `saveOrderData` ajouté ✅
- [x] Composant appelle `saveOrderData` automatiquement ✅
- [ ] Les tables contiennent des données (à vérifier après test)

## 📝 Fichiers modifiés dans ce patch

1. `src/hooks/useSwitchgrid.ts` (+35 lignes)
2. `src/components/switchgrid/DataRetrieval.tsx` (+14 lignes)

Total : **2 fichiers, +49 lignes**

---

**Status : ✅ PRÊT POUR RE-TEST**

Teste maintenant et dis-moi si les tables se remplissent !
