import { 
  SwitchgridConfig, 
  SearchContractParams, 
  SearchContractResponse,
  CreateAskRequest,
  Ask,
  OrderRequest,
  OrderResponse,
  SwitchgridError
} from '../../types/switchgrid';

// Fonction utilitaire pour mapper les directions
export type ApiDirection = "SOUTIRAGE" | "INJECTION";

/** Map interne -> API */
export function toApiDirection(dir?: string): ApiDirection | undefined {
  if (!dir) return undefined;
  const d = dir.toUpperCase();
  if (d === "CONSUMPTION" || d === "SOUTIRAGE") return "SOUTIRAGE";
  if (d === "PRODUCTION" || d === "INJECTION") return "INJECTION";
  throw new Error(`Invalid direction: ${dir}`);
}

/** Transforme le body pour un dialecte donné */
function transformBodyForDialect(body: OrderRequest, dialect: 'english' | 'french'): OrderRequest {
  const transformedRequests = body.requests.map(request => {
    const transformed = { ...request };
    
    // Supprimer la direction pour C68 (ne la supporte pas)
    if (request.type === 'C68') {
      delete transformed.direction;
      return transformed;
    }
    
    // Transformer la direction selon le dialecte
    if (request.direction) {
      if (dialect === 'english') {
        transformed.direction = request.direction === 'SOUTIRAGE' ? 'CONSUMPTION' : 'INJECTION';
      } else {
        transformed.direction = toApiDirection(request.direction);
      }
    }
    
    return transformed;
  });
  
  return {
    ...body,
    requests: transformedRequests
  };
}

/** Fait un appel POST /order unique */
async function postOrderOnce(url: string, headers: Record<string, string>, body: OrderRequest): Promise<OrderResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorData: SwitchgridError;
    
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { 
        error: `HTTP ${response.status}: ${response.statusText}`,
        message: errorText
      };
    }
    
    throw { response, errorData };
  }
  
  return response.json();
}

/** Appel simple via Edge Function Supabase */
export async function createOrderSmart(baseUrl: string, token: string, body: OrderRequest): Promise<OrderResponse> {
  console.log('📤 Création commande via Edge Function');

  // Utiliser l'Edge Function Supabase au lieu d'appeler directement l'API
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configuration Supabase manquante');
  }

  // Récupérer le token utilisateur depuis le localStorage
  const supabaseSession = localStorage.getItem('supabase.auth.token');
  let userToken = supabaseKey; // Fallback sur anon key

  if (supabaseSession) {
    try {
      const session = JSON.parse(supabaseSession);
      userToken = session.currentSession?.access_token || supabaseKey;
    } catch (e) {
      console.warn('Impossible de récupérer le token utilisateur, utilisation anon key');
    }
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/switchgrid-orders`;

  console.log('🔗 URL Edge Function:', edgeFunctionUrl);

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
      'apikey': supabaseKey
    },
    body: JSON.stringify({
      action: 'create_order',
      orderRequest: body
    })
  });

  console.log('📥 Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Edge Function error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });

    let errorData: any;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }

    throw new Error(errorData.error || `Erreur ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Commande créée:', result);
  return result;
}