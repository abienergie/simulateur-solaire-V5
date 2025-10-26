# Exemples d'intégration C68 dans l'application

## 🎯 Cas d'usage réels

### 1. Récupération des détails du contrat lors de la saisie du PRM

```typescript
// Dans votre formulaire de saisie client
import { createC68Order, parseC68ContractData } from '../utils/api/switchgridC68Api';

function ClientForm() {
  const [prm, setPrm] = useState('');
  const [contractDetails, setContractDetails] = useState(null);

  const handleFetchContract = async () => {
    try {
      // Supposons que vous avez déjà le consentId
      const result = await createC68Order({
        prm,
        consentId: 'your-consent-id'
      });

      const parsed = parseC68ContractData(result.c68);
      setContractDetails(parsed);

      // Pré-remplir le formulaire avec les données du contrat
      setPuissanceSouscrite(parsed.puissanceSouscrite);
      setFormuleTarifaire(parsed.formuleTarifaire);

    } catch (error) {
      console.error('Erreur récupération contrat:', error);
      alert('Impossible de récupérer les détails du contrat');
    }
  };

  return (
    <form>
      <input value={prm} onChange={(e) => setPrm(e.target.value)} />
      <button onClick={handleFetchContract}>
        Récupérer les détails du contrat
      </button>
      {contractDetails && (
        <div>
          <p>Puissance: {contractDetails.puissanceSouscrite} kVA</p>
          <p>Formule: {contractDetails.formuleTarifaire}</p>
        </div>
      )}
    </form>
  );
}
```

### 2. Flux complet avec résolution automatique du consentId

```typescript
// Utilisation avec askId (flux Switchgrid complet)
async function handleSwitchgridFlow(prm: string, askId: string) {
  try {
    console.log('Étape 1: Récupération des détails du contrat...');

    // L'API résoudra automatiquement le consentId depuis l'askId
    const result = await createC68Order({
      prm,
      askId,
      userId: currentUser.id // Optionnel mais recommandé
    });

    console.log('✅ Contrat récupéré:', result.c68);

    // Les données sont déjà sauvegardées en base
    // Vous pouvez maintenant continuer avec les autres étapes

    return result;

  } catch (error) {
    if (error.message.includes('consentId')) {
      // Le PRM n'a pas de consent valide dans cet ask
      console.error('Pas de consentement pour ce PRM');
      return null;
    }
    throw error;
  }
}
```

### 3. Intégration dans le hook useSwitchgrid existant

```typescript
// src/hooks/useSwitchgrid.ts

import { createC68Order } from '../utils/api/switchgridC68Api';

export function useSwitchgrid() {
  // ... code existant ...

  // Nouvelle fonction pour C68
  const fetchContractDetails = async (prm: string, consentId?: string, askId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await createC68Order({
        prm,
        consentId,
        askId
      });

      // Stocker dans le state
      setContractData(result.c68);

      return result;

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    // ... exports existants ...
    fetchContractDetails
  };
}
```

### 4. Affichage des détails du contrat

```typescript
// Composant pour afficher les détails du contrat
import { parseC68ContractData } from '../utils/api/switchgridC68Api';

function ContractDetails({ c68Data }: { c68Data: any }) {
  const contract = parseC68ContractData(c68Data);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Détails du contrat</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-gray-600">PRM:</span>
          <span className="ml-2 font-medium">{contract.prm}</span>
        </div>

        <div>
          <span className="text-gray-600">Puissance:</span>
          <span className="ml-2 font-medium">{contract.puissanceSouscrite} kVA</span>
        </div>

        <div>
          <span className="text-gray-600">Formule tarifaire:</span>
          <span className="ml-2 font-medium">{contract.formuleTarifaire}</span>
        </div>

        <div>
          <span className="text-gray-600">Type compteur:</span>
          <span className="ml-2 font-medium">{contract.typeCompteur}</span>
        </div>

        <div>
          <span className="text-gray-600">Calendrier:</span>
          <span className="ml-2 font-medium">{contract.calendrierDistributeur}</span>
        </div>

        <div>
          <span className="text-gray-600">État:</span>
          <span className="ml-2 font-medium">{contract.etatContractuel}</span>
        </div>
      </div>
    </div>
  );
}
```

### 5. Gestion d'erreurs robuste

```typescript
async function fetchWithRetry(prm: string, consentId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await createC68Order({ prm, consentId });
      return result;

    } catch (error: any) {
      if (error.message.includes('Timeout')) {
        // Réessayer en cas de timeout
        console.log(`Tentative ${i + 1}/${maxRetries} échouée, réessai...`);
        if (i === maxRetries - 1) throw error;
        continue;
      }

      // Autres erreurs : ne pas réessayer
      throw error;
    }
  }
}
```

### 6. Mise en cache des résultats

```typescript
// Cache simple en mémoire
const contractCache = new Map<string, any>();

async function getCachedContract(prm: string, consentId: string) {
  const cacheKey = `${prm}-${consentId}`;

  // Vérifier le cache
  if (contractCache.has(cacheKey)) {
    console.log('📦 Contract trouvé dans le cache');
    return contractCache.get(cacheKey);
  }

  // Sinon, récupérer depuis l'API
  const result = await createC68Order({ prm, consentId });

  // Mettre en cache (expire après 1h)
  contractCache.set(cacheKey, result);
  setTimeout(() => contractCache.delete(cacheKey), 60 * 60 * 1000);

  return result;
}
```

### 7. Utilisation dans un effet React

```typescript
function ContractViewer({ prm, consentId }: { prm: string; consentId: string }) {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadContract() {
      try {
        setLoading(true);
        const result = await createC68Order({ prm, consentId });

        if (!cancelled) {
          setContract(result.c68);
        }
      } catch (error) {
        console.error('Erreur chargement contrat:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadContract();

    return () => {
      cancelled = true;
    };
  }, [prm, consentId]);

  if (loading) return <div>Chargement...</div>;
  if (!contract) return <div>Aucun contrat trouvé</div>;

  return <ContractDetails c68Data={contract} />;
}
```

### 8. Récupération depuis la base de données

```typescript
// Si le contrat a déjà été récupéré, vous pouvez le lire depuis Supabase
import { supabase } from '../lib/supabase';

async function getStoredContract(prm: string, userId: string) {
  const { data, error } = await supabase
    .from('switchgrid_contract_details')
    .select('*')
    .eq('pdl', prm)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    console.log('📦 Contrat trouvé en base');
    return data.contract_data;
  }

  return null;
}

// Utilisation combinée (base + API si nécessaire)
async function getContractWithFallback(prm: string, consentId: string, userId: string) {
  // Essayer d'abord la base
  let contract = await getStoredContract(prm, userId);

  if (contract) {
    return contract;
  }

  // Sinon, récupérer depuis l'API
  const result = await createC68Order({ prm, consentId, userId });
  return result.c68;
}
```

## 🔄 Flux recommandé

```
1. L'utilisateur entre son PRM
2. Vérifier si le contrat existe en base (getStoredContract)
3. Si oui → afficher
4. Si non → demander consentId/askId
5. Récupérer via C68 (createC68Order)
6. Afficher et utiliser
```

## ⚡ Optimisations

1. **Mise en cache** : Éviter les appels répétés
2. **Vérification base d'abord** : Réduire les coûts API
3. **Loading states** : UX pendant le polling (peut prendre jusqu'à 90s)
4. **Retry logic** : Gérer les timeouts
5. **Error boundaries** : Ne pas casser l'app entière

## 🎨 UX recommandée

```typescript
function ContractFetcher({ prm, consentId }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  const handleFetch = async () => {
    setStatus('loading');
    setProgress(0);

    // Simuler la progression pendant le polling
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 1000);

    try {
      const result = await createC68Order({ prm, consentId });
      setProgress(100);
      setStatus('success');
    } catch (error) {
      setStatus('error');
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div>
      <button onClick={handleFetch} disabled={status === 'loading'}>
        Récupérer le contrat
      </button>

      {status === 'loading' && (
        <div>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <p>Récupération en cours... {progress}%</p>
        </div>
      )}
    </div>
  );
}
```
