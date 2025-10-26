# 🎯 ÉTAPE 1 - Instructions de test

## 📦 Fichiers livrés

1. **Migration SQL** : `supabase/migrations/20251004120000_create_switchgrid_storage_tables.sql`
   - Crée 8 tables pour stocker les données Switchgrid

2. **Edge Function modifiée** : `supabase/functions/switchgrid-orders/index.ts`
   - Nouvelle action `save_order_data` pour sauvegarder les données
   - Parsing automatique des tarifs (BASE, HP/HC, TEMPO, etc.)
   - Retourne des statistiques détaillées

3. **Documentation** : `SWITCHGRID_SETUP.md`
   - Guide complet de la solution

## 🚀 Procédure de test (5 étapes)

### Étape A - Appliquer la migration

**Via CLI :**
```bash
cd /tmp/cc-agent/53217568/project
npx supabase db push
```

**Via Supabase Dashboard (alternative) :**
1. Aller sur https://supabase.com
2. Ouvrir votre projet
3. Menu **SQL Editor**
4. Copier/coller tout le fichier `supabase/migrations/20251004120000_create_switchgrid_storage_tables.sql`
5. Cliquer **Run**
6. Vérifier qu'il n'y a pas d'erreur

### Étape B - Déployer l'Edge Function

```bash
npx supabase functions deploy switchgrid-orders
```

Attendre le message de succès.

### Étape C - IMPORTANT : Modifier le composant DataRetrieval

⚠️ **ACTUELLEMENT, la sauvegarde n'est PAS déclenchée automatiquement**

Il faut modifier `src/components/switchgrid/DataRetrieval.tsx` pour appeler la nouvelle action `save_order_data`.

**Option 1 - Test manuel rapide (recommandé pour validation)** :

Ajouter temporairement un bouton "Sauvegarder" dans le composant après la récupération réussie.

**Option 2 - Intégration automatique** :

Modifier la fonction `processOrderData` pour appeler automatiquement `save_order_data` après le traitement.

Je peux te fournir le code exact si tu veux, mais pour l'instant on teste juste que la migration et l'Edge Function fonctionnent.

### Étape D - Tester manuellement l'Edge Function

Pour valider que tout fonctionne SANS modifier le front, tu peux appeler directement l'Edge Function via curl ou Postman.

**Test avec curl :**

```bash
# Remplace ces valeurs :
# - YOUR_SUPABASE_URL : L'URL de ton projet Supabase
# - YOUR_ANON_KEY : Ta clé ANON Supabase
# - YOUR_AUTH_TOKEN : Le token JWT d'un utilisateur authentifié
# - Un PDL et orderData de test

curl -X POST https://YOUR_SUPABASE_URL/functions/v1/switchgrid-orders \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "save_order_data",
    "pdl": "14862373311505",
    "orderData": {
      "id": "test-order-123",
      "status": "SUCCESS",
      "askId": "test-ask",
      "consentId": "test-consent",
      "requests": []
    },
    "allRequestsData": {
      "contractDetails": {
        "formule_tarifaire_acheminement": "BTINF_HC",
        "puissance_souscrite": 6
      },
      "consumption": [
        {
          "date": "2024-10-01",
          "hp": 10.5,
          "hc": 5.2
        },
        {
          "date": "2024-10-02",
          "hp": 12.3,
          "hc": 6.1
        }
      ]
    }
  }'
```

Si ça marche, tu devrais recevoir :

```json
{
  "success": true,
  "stats": {
    "consumption": 2,
    "production": 0,
    "consumptionMaxPower": 0,
    "productionMaxPower": 0,
    "consumptionLoadCurve": 0,
    "productionLoadCurve": 0,
    "contract": 1
  },
  "message": "Données sauvegardées avec succès"
}
```

### Étape E - Vérifier les données dans Supabase

1. Ouvrir **Supabase Dashboard**
2. Menu **Table Editor**
3. Regarder les tables :

```sql
-- Voir les contrats sauvegardés
SELECT * FROM switchgrid_contract_details;

-- Voir la consommation
SELECT * FROM switchgrid_consumption_daily LIMIT 10;

-- Compter les lignes
SELECT
  (SELECT COUNT(*) FROM switchgrid_contract_details) as contracts,
  (SELECT COUNT(*) FROM switchgrid_consumption_daily) as consumption_days,
  (SELECT COUNT(*) FROM switchgrid_production_daily) as production_days;
```

Si tu vois des données, **l'Étape 1 est réussie** ! ✅

## 🎯 Critères de validation Étape 1

- ✅ Les 8 tables existent dans Supabase
- ✅ L'Edge Function déployée sans erreur
- ✅ Un appel à `save_order_data` retourne `success: true`
- ✅ Les données apparaissent dans les tables
- ✅ Le champ `energy_by_cadran` contient du JSON valide
- ✅ Le `tariff_type` est détecté correctement

## ❓ FAQ Dépannage

### "Error: relation switchgrid_orders does not exist"

→ La migration n'a pas été appliquée. Retourner à l'Étape A.

### "Error: Unauthorized"

→ Le token d'authentification n'est pas valide. Vérifier que l'utilisateur est bien connecté.

### "Error: Missing required data"

→ Le payload envoyé à `save_order_data` est incomplet. Vérifier `pdl`, `orderData`, et `allRequestsData`.

### Aucune donnée dans les tables après appel

→ Regarder les logs de l'Edge Function dans Supabase Dashboard → Edge Functions → switchgrid-orders → Logs.

### "constraint violation"

→ Normal si tu testes plusieurs fois avec les mêmes données. L'UPSERT devrait gérer ça, mais s'il y a une erreur de syntaxe, vérifier les contraintes UNIQUE.

## 📞 Prochaine étape

Une fois que tu as validé que :
- Les tables sont créées ✅
- L'Edge Function fonctionne ✅
- Les données sont sauvegardées ✅

**Confirme-moi et on passe à l'Étape 2** : Intégrer l'appel automatique dans le front + créer les hooks de lecture.

---

**IMPORTANT** : Pour l'instant, c'est juste un test d'infrastructure. Le front ne déclenche PAS encore la sauvegarde automatiquement. On va l'ajouter dans l'Étape 2.
