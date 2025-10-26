# Intégration C68 - Switchgrid

## 📋 Vue d'ensemble

L'intégration C68 permet de récupérer les détails du contrat électrique d'un client via l'API Switchgrid. Cette intégration est implémentée dans la fonction Supabase Edge `switchgrid-orders` avec l'action `create_order_c68`.

## 🚀 Utilisation

### Option 1 : Avec consentId

Si vous avez déjà un `consentId`, utilisez-le directement :

```typescript
import { createC68Order } from './utils/api/switchgridC68Api';

const result = await createC68Order({
  prm: "14862373311505",
  consentId: "334be8a8-a600-4d09-b0ec-ea034a5be41d"
});

console.log('C68 Data:', result.c68);
console.log('Order ID:', result.orderId);
```

### Option 2 : Avec askId

Si vous n'avez qu'un `askId`, la fonction résoudra automatiquement le `consentId` :

```typescript
const result = await createC68Order({
  prm: "14862373311505",
  askId: "d020f4fa-aba3-47a1-8f95-1b26f9d42974"
});
```

### Option 3 : Appel direct à l'API

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/switchgrid-orders`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "create_order_c68",
    prm: "14862373311505",
    consentId: "334be8a8-a600-4d09-b0ec-ea034a5be41d",
    userId: currentUserId // optionnel
  })
});

const { c68, orderId, requestId, error } = await response.json();
```

## 📊 Structure de la réponse

```typescript
{
  orderId: string;        // ID de la commande Switchgrid
  requestId: string;      // ID de la requête C68
  c68: {
    point_id: string;                           // PRM
    puissance_souscrite: number;                // Puissance en kVA
    formule_tarifaire_acheminement: string;     // Ex: "BTINFCUST"
    type_compteur: string;                      // Ex: "LINKY"
    calendrier_distributeur: string;            // Ex: "HP/HC"
    date_debut_contrat: string;                 // Date ISO
    etat_contractuel: string;                   // Ex: "SERVICE"
    segment_client_final: string;               // Ex: "RES"
    // ... autres champs selon le contrat
  }
}
```

## 🔧 Fonctionnement technique

### Étapes de l'action `create_order_c68`

1. **Validation** : Vérifie que `prm` et (`consentId` ou `askId`) sont fournis
2. **Résolution du consentId** : Si seul `askId` est fourni, récupère le `consentId` via `GET /ask/{askId}`
3. **Création de la commande** : `POST /order` avec le type `C68`
4. **Polling** : Attend que le statut passe à `SUCCESS` (timeout : 90s, intervalle : 2s)
5. **Téléchargement** : Récupère le JSON depuis `dataUrl` (URL signée temporaire)
6. **Sauvegarde** : Stocke les données dans `switchgrid_contract_details`
7. **Retour** : Renvoie l'objet complet avec `c68`, `orderId`, `requestId`

### Helpers disponibles

```typescript
// Attendre X millisecondes
function sleep(ms: number): Promise<void>

// Récupérer une commande
async function sgGetOrder(orderId: string): Promise<any>

// Poller jusqu'au succès C68
async function sgPollOrderUntilC68Success(
  orderId: string,
  timeoutMs?: number,  // défaut: 90000 (90s)
  stepMs?: number      // défaut: 2000 (2s)
): Promise<any>

// Résoudre consentId depuis askId
async function sgGetConsentIdFromAsk(
  askId: string,
  prm: string
): Promise<string>

// Créer une commande C68
async function sgPostOrderC68(
  consentId: string,
  prm: string
): Promise<any>
```

## 💾 Base de données

Les données C68 sont automatiquement sauvegardées dans la table `switchgrid_contract_details` :

```sql
CREATE TABLE switchgrid_contract_details (
  user_id UUID NOT NULL,
  pdl TEXT NOT NULL,
  contract_data JSONB,
  tariff_type TEXT,
  tariff_structure JSONB,
  formula_code TEXT,
  source_order_id TEXT,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (pdl, user_id)
);
```

## 🧪 Test de l'intégration

### Page de test

Une page de test est disponible : `/c68-test`

Ou utilisez le composant directement :

```typescript
import C68OrderTest from './components/switchgrid/C68OrderTest';

function MyPage() {
  return <C68OrderTest />;
}
```

### Test manuel avec curl

```bash
curl -X POST https://your-project.supabase.co/functions/v1/switchgrid-orders \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_order_c68",
    "prm": "14862373311505",
    "consentId": "334be8a8-a600-4d09-b0ec-ea034a5be41d"
  }'
```

## ⚠️ Gestion des erreurs

### Erreurs courantes

| Code | Erreur | Solution |
|------|--------|----------|
| 400 | `prm requis` | Fournir un PRM valide |
| 400 | `consentId ou askId requis` | Fournir au moins l'un des deux |
| 401 | Unauthorized | Vérifier le token Switchgrid |
| 404 | `Aucun consentId trouvé` | Le PRM n'existe pas dans l'ask |
| 500 | `C68 failed` | Voir `errorMessage` dans les logs |
| 500 | `Timeout waiting for C68` | La commande a pris plus de 90s |

### Exemple de gestion d'erreur

```typescript
try {
  const result = await createC68Order({ prm, consentId });
  console.log('Success:', result);
} catch (error) {
  if (error.message.includes('consentId')) {
    // Problème d'authentification
    console.error('Consent invalide');
  } else if (error.message.includes('Timeout')) {
    // Temps d'attente dépassé
    console.error('Délai dépassé, réessayez');
  } else {
    // Autre erreur
    console.error('Erreur:', error.message);
  }
}
```

## 🔒 Sécurité

- Le token Switchgrid est stocké côté serveur uniquement (Edge Function)
- Jamais exposé au client
- Pour une sécurité renforcée, utilisez : `Deno.env.get('SWITCHGRID_TOKEN')`

## 📚 Ressources

- [Documentation Switchgrid API](https://app.switchgrid.tech/enedis/v2)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- Fichier source : `supabase/functions/switchgrid-orders/index.ts`
- Utilitaire front : `src/utils/api/switchgridC68Api.ts`
- Composant test : `src/components/switchgrid/C68OrderTest.tsx`

## 🎯 Prochaines étapes

1. Déployer la fonction Edge : `supabase functions deploy switchgrid-orders`
2. Tester avec des données réelles
3. Intégrer dans le flux principal de l'application
4. Ajouter un cache si nécessaire pour éviter les appels répétés
