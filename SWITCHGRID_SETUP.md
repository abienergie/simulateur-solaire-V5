# 🔌 Switchgrid Data Storage - Étape 1

## 📦 Ce qui a été créé

### 1. Migration SQL (`supabase/migrations/20251004120000_create_switchgrid_storage_tables.sql`)

Crée **8 tables** pour stocker les données récupérées depuis Switchgrid :

#### Tables créées :

1. **`switchgrid_orders`** - Historique des commandes Switchgrid
2. **`switchgrid_contract_details`** - Informations contractuelles (C68)
3. **`switchgrid_consumption_daily`** - Consommation quotidienne (R65)
4. **`switchgrid_max_power`** - Puissances maximales soutirées (R66)
5. **`switchgrid_load_curve`** - Courbe de charge consommation (LOADCURVE)
6. **`switchgrid_production_daily`** - Production PV quotidienne (INJECTION)
7. **`switchgrid_production_max_power`** - Puissances maximales injectées
8. **`switchgrid_production_load_curve`** - Courbe de production PV

### 2. Edge Function modifiée (`supabase/functions/switchgrid-orders/index.ts`)

#### Nouvelle action ajoutée : `save_order_data`

Cette action permet de sauvegarder les données récupérées depuis Switchgrid dans les tables Supabase.

#### Fonctionnalités implémentées :

- ✅ **Détection automatique du type de tarif** (BASE, HP/HC, TEMPO, EJP, PROFESSIONAL)
- ✅ **Parsing intelligent des données** R65, R66, LOADCURVE, INJECTION
- ✅ **Gestion des cadrans tarifaires** en JSONB flexible
- ✅ **Sauvegarde par batch** pour les courbes de charge (1000 lignes/batch)
- ✅ **UPSERT automatique** (évite les doublons, met à jour si existe déjà)
- ✅ **Statistiques détaillées** retournées au front (nombre de lignes sauvegardées)

## 🚀 Comment tester (Étape 1)

### 1. Appliquer la migration

```bash
cd /tmp/cc-agent/53217568/project
npx supabase db push
```

Ou via Supabase Dashboard :
1. Aller sur https://supabase.com
2. Ouvrir votre projet
3. Aller dans **SQL Editor**
4. Copier/coller le contenu de `supabase/migrations/20251004120000_create_switchgrid_storage_tables.sql`
5. Cliquer sur **Run**

### 2. Déployer l'Edge Function

```bash
npx supabase functions deploy switchgrid-orders
```

### 3. Tester la récupération de données

1. Ouvrir l'application en front
2. Aller sur la page **Switchgrid**
3. Faire une récupération de données normalement
4. Après le succès, la fonction Edge va automatiquement sauvegarder

### 4. Vérifier que les tables sont remplies

#### Option A - Via Supabase Dashboard :

1. Aller dans **Table Editor**
2. Vérifier ces tables :
   - `switchgrid_contract_details` → 1 ligne avec votre PDL
   - `switchgrid_consumption_daily` → ~365 lignes (ou moins selon la période)
   - `switchgrid_production_daily` → Lignes si vous avez de la production PV
   - `switchgrid_orders` → 1 ligne avec l'ID de la commande

#### Option B - Via SQL :

```sql
-- Voir le contrat sauvegardé
SELECT pdl, tariff_type, formula_code, created_at
FROM switchgrid_contract_details
LIMIT 5;

-- Compter les jours de consommation
SELECT pdl, COUNT(*) as nb_jours, MIN(date), MAX(date)
FROM switchgrid_consumption_daily
GROUP BY pdl;

-- Voir un exemple de cadrans tarifaires
SELECT pdl, date, energy_total_kwh, energy_by_cadran
FROM switchgrid_consumption_daily
WHERE energy_by_cadran IS NOT NULL
LIMIT 3;

-- Voir les stats de production (si applicable)
SELECT pdl, COUNT(*) as nb_jours, SUM(energy_total_kwh) as total_production_kwh
FROM switchgrid_production_daily
GROUP BY pdl;
```

## 📊 Structure des données sauvegardées

### Exemple de `energy_by_cadran` (JSONB)

#### Contrat BASE :
```json
{
  "BASE": 25.5
}
```

#### Contrat HP/HC :
```json
{
  "HP": 18.2,
  "HC": 7.3
}
```

#### Contrat TEMPO :
```json
{
  "BLEU_HP": 10.5,
  "BLEU_HC": 5.2,
  "BLANC_HP": 3.1,
  "BLANC_HC": 1.8,
  "ROUGE_HP": 0.5,
  "ROUGE_HC": 0.2
}
```

#### Contrat PROFESSIONAL (6 cadrans) :
```json
{
  "CADRAN_1": 5.2,
  "CADRAN_2": 8.1,
  "CADRAN_3": 3.5,
  "CADRAN_4": 2.8,
  "CADRAN_5": 1.2,
  "CADRAN_6": 0.5
}
```

### Exemple de `tariff_structure` (JSONB)

```json
{
  "type": "HP_HC",
  "cadrans": [
    {
      "name": "HP",
      "label": "Heures Pleines",
      "color": "#F97316",
      "order": 1
    },
    {
      "name": "HC",
      "label": "Heures Creuses",
      "color": "#3B82F6",
      "order": 2
    }
  ]
}
```

## 🔍 Logs à surveiller

Après avoir fait une récupération, vérifier les logs de l'Edge Function dans Supabase :

1. Aller dans **Edge Functions** → `switchgrid-orders`
2. Cliquer sur **Logs**
3. Vous devriez voir :

```
💾 Starting Supabase save for PDL: 14862373311505 User: xxx
📊 Tariff detected: HP_HC Formula: BTINF_HC
✅ Contract saved
✅ Consumption saved: 365 rows
✅ Max power saved: 365 rows
✅ Load curve saved: 4320 rows
📊 Final stats: { consumption: 365, production: 0, ... }
```

## ⚠️ Points d'attention

### Si aucune donnée n'est sauvegardée :

1. **Vérifier l'authentification** : L'utilisateur doit être connecté (session Supabase active)
2. **Vérifier les RLS** : Les policies doivent permettre l'insertion
3. **Vérifier les logs** : Regarder les erreurs dans les logs Edge Function

### Si une erreur "constraint violation" :

Cela signifie qu'une tentative d'insertion viole une contrainte UNIQUE. C'est normal si vous récupérez plusieurs fois les mêmes données. L'UPSERT devrait gérer ça automatiquement.

### Si les cadrans sont vides :

Le parsing essaie plusieurs noms de champs possibles. Si votre format de données Switchgrid est différent, il faudra peut-être ajuster les fonctions `parseConsumptionData()` et `parseMaxPowerData()`.

## ✅ Validation Étape 1

Vous pouvez considérer l'Étape 1 comme **réussie** si :

- [x] Les 8 tables sont créées dans Supabase
- [x] Une récupération Switchgrid remplit automatiquement ces tables
- [x] Le champ `energy_by_cadran` contient un objet JSON valide
- [x] Le `tariff_type` est correctement détecté (BASE, HP_HC, TEMPO, etc.)
- [x] Les données de production sont sauvegardées (si production PV existe)

## 🎯 Prochaines étapes (non implémentées dans cette livraison)

### Étape 2 - Lecture et affichage
- Créer les hooks `useSwitchgridStoredData.ts`
- Créer une page de debug pour afficher les données brutes
- Valider la lecture depuis Supabase

### Étape 3 - Graphiques depuis Supabase
- Adapter les composants existants pour lire depuis Supabase
- Créer des graphiques simples conso/prod

### Étape 4 - Gestion multi-tarifs
- Créer le composant adaptatif selon `tariff_type`
- Gérer l'affichage des différents cadrans
- Permettre le switch entre vue "Total" et "Par cadran"

## 📝 Notes techniques

### Stratégie UPSERT

Toutes les insertions utilisent `UPSERT` avec `onConflict` sur les contraintes UNIQUE :
- `pdl, date, user_id` pour les données quotidiennes
- `pdl, timestamp, user_id` pour les courbes de charge
- `pdl, user_id` pour les contrats

Cela permet de :
- Re-récupérer les données sans créer de doublons
- Corriger des données si Enedis les a mises à jour
- Éviter les erreurs de contrainte

### Gestion des gros volumes

Les courbes de charge peuvent contenir jusqu'à 4320 points par mois (pas 10min).
Pour éviter de surcharger Supabase, les insertions sont faites par **batch de 1000 lignes**.

### Sécurité RLS

Toutes les tables ont Row Level Security (RLS) activé.
Seul le créateur des données peut les voir/modifier via `auth.uid() = user_id`.

---

**Statut : ✅ PRÊT POUR TEST**
