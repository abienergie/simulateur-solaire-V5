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

class SwitchgridApi {
  private static instance: SwitchgridApi;
  private config: SwitchgridConfig;

  private constructor() {
    this.config = {
      apiKey: 'c85136b872194092cf9d013c6fe6ce5c',
      baseUrl: 'https://app.switchgrid.tech/enedis/v2'
    };
    
    console.log('🔧 Switchgrid API initialized with direct URL:', this.config.baseUrl);
  }

  public static getInstance(): SwitchgridApi {
    if (!SwitchgridApi.instance) {
      SwitchgridApi.instance = new SwitchgridApi();
    }
    return SwitchgridApi.instance;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    console.log('🌐 Making Switchgrid API request:', {
      url,
      method: options.method || 'GET',
      hasBody: !!options.body,
      timestamp: new Date().toISOString()
    });
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ABI-Energie-Simulator/1.0',
      'Origin': 'https://app.switchgrid.tech'
    };

    console.log('📤 Request headers (sanitized):', {
      'Content-Type': defaultHeaders['Content-Type'],
      'Accept': defaultHeaders['Accept'],
      'User-Agent': defaultHeaders['User-Agent'],
      'Authorization': `Bearer ${this.config.apiKey.substring(0, 8)}...`
    });

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });
      
      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('Content-Type'),
        contentLength: response.headers.get('Content-Length')
      });
    } catch (fetchError) {
      console.error('❌ Network error:', fetchError);
      
      // Gestion spécifique des erreurs CORS
      if (fetchError.message.includes('CORS') || fetchError.message.includes('blocked')) {
        throw new Error(
          `Erreur réseau: Impossible de contacter l'API Switchgrid. ` +
          `Veuillez vérifier votre connexion internet et réessayer dans quelques minutes.`
        );
      }
      
      // Retry automatique après 2 secondes en cas d'erreur réseau
      console.log('🔄 Retry automatique dans 2 secondes...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers
          }
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          console.log('✅ Retry réussi après erreur réseau');
          return retryData;
        }
      } catch (retryError) {
        console.log('❌ Retry échoué');
      }
      
      throw new Error(`Erreur réseau persistante: ${fetchError.message}`);
    }

    if (!response.ok) {
      console.error('❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url,
        timestamp: new Date().toISOString()
      });
      
      let errorData: SwitchgridError;
      try {
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        
        // Vérifier si c'est du HTML (page d'erreur)
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
          console.error('❌ API returned HTML instead of JSON - possible endpoint issue');
          throw new Error(
            `L'API Switchgrid est temporairement indisponible (erreur ${response.status}). ` +
            `Cela peut être dû à une maintenance ou un problème temporaire. ` +
            `Veuillez réessayer dans quelques minutes.`
          );
        }
        
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('❌ Failed to parse error response as JSON:', parseError);
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            message: `Erreur API Switchgrid (${response.status}): Réponse non-JSON reçue - ${errorText.substring(0, 200)}...`
          };
        }
      } catch (readError) {
        console.error('❌ Failed to read error response:', readError);
        errorData = { 
          error: `HTTP ${response.status}: ${response.statusText}`,
          message: `Erreur API Switchgrid (${response.status}): Impossible de lire les détails de l'erreur`
        };
      }
      
      console.error('❌ Parsed error data:', errorData);
      
      // Extraire le message d'erreur approprié
      let errorMessage = '';
      if (errorData.error && Array.isArray(errorData.error) && errorData.error.length > 0) {
        // Format Switchgrid avec array d'erreurs
        errorMessage = errorData.error[0].message || errorData.error[0].error || 'Erreur de validation';
      } else {
        errorMessage = errorData.message || errorData.error || `Erreur API Switchgrid (${response.status}): ${response.statusText}`;
      }
      
      throw new Error(
        errorMessage
      );
    }

    try {
      const responseData = await response.json();
      console.log('✅ Successful response data:', responseData);
      return responseData;
    } catch (parseError) {
      console.error('❌ Failed to parse successful response as JSON:', parseError);
      throw new Error('Réponse API invalide (JSON malformé)');
    }
  }

  /**
   * Recherche un contrat électrique par nom et adresse
   */
  public async searchContract(params: SearchContractParams): Promise<SearchContractResponse> {
    console.log('🔍 Searching contract with params:', params);
    
    const searchParams = new URLSearchParams();
    
    if (params.name && params.name.trim()) {
      searchParams.append('name', params.name);
    }
    
    if (params.address && params.address.trim()) {
      searchParams.append('address', params.address);
    }
    
    if (params.prm && params.prm.trim()) {
      searchParams.append('prm', params.prm);
    }

    console.log('🔗 Search URL params:', searchParams.toString());
    
    const result = await this.makeRequest<SearchContractResponse>(
      `/search_contract?${searchParams.toString()}`
    );
    
    console.log('✅ Search contract result:', result);
    return result;
  }

  /**
   * Recherche des contrats à partir de factures uploadées
   */
  public async searchContractsFromInvoices(files: File[]): Promise<any> {
    console.log('🔍 Recherche via factures:', files.length, 'fichiers');
    
    try {
      const formData = new FormData();
      
      files.forEach((file, index) => {
        console.log(`📄 Fichier ${index + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        formData.append('files', file);
      });

      const url = `${this.config.baseUrl}/search_contracts_from_invoices`;
      
      console.log('📤 Envoi vers:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Origin': 'https://app.switchgrid.tech',
          'User-Agent': 'ABI-Energie-Simulator/1.0'
          // Ne pas définir Content-Type pour FormData - le navigateur le fait automatiquement
        },
        body: formData
      });
      
      console.log('📥 Réponse reçue:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('Content-Type')
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur upload factures:', errorText);
        
        // Vérifier si c'est du HTML (page d'erreur)
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
          throw new Error(
            `L'API Switchgrid est temporairement indisponible pour l'analyse de factures (erreur ${response.status}). ` +
            `Veuillez utiliser la recherche manuelle ou réessayer dans quelques minutes.`
          );
        }
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          throw new Error(`Erreur ${response.status}: ${errorText.substring(0, 200)}...`);
        }
        
        const errorMessage = errorData.error?.[0]?.message || errorData.message || errorData.error || `Erreur ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('✅ Analyse de factures réussie:', responseData);
      
      return responseData;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse des factures:', error);
      
      // Si c'est une erreur réseau, suggérer la recherche manuelle
      if (error.message.includes('fetch')) {
        throw new Error(
          'Impossible de contacter le service d\'analyse de factures. ' +
          'Veuillez utiliser la recherche manuelle ou vérifier votre connexion internet.'
        );
      }
      
      throw error;
    }
  }

  /**
   * Crée une demande de consentement
   */
  public async createAsk(request: CreateAskRequest): Promise<Ask> {
    return this.makeRequest<Ask>('/ask', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Récupère le statut d'une demande de consentement
   */
  public async getAsk(askId: string): Promise<Ask> {
    return this.makeRequest<Ask>(`/ask/${askId}`);
  }

  /**
   * Liste toutes les demandes de consentement
   */
  public async listAsks(params?: {
    prm?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ items: Ask[]; totalItemsCount: number }> {
    const searchParams = new URLSearchParams();
    
    if (params?.prm) searchParams.append('prm', params.prm);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return this.makeRequest<{ items: Ask[]; totalItemsCount: number }>(
      `/ask?${searchParams.toString()}`
    );
  }

  /**
   * Télécharge la preuve de consentement en PDF
   */
  public async getAskProof(askId: string): Promise<Blob> {
    const response = await fetch(`${this.config.baseUrl}/ask/${askId}/proof`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/pdf'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur lors du téléchargement de la preuve: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Commande des données
   */
  public async createOrder(request: OrderRequest): Promise<OrderResponse> {
    return createOrderSmart(this.config.baseUrl, this.config.apiKey, request);
  }

  /**
   * Récupère le statut d'une commande
   */
  public async getOrder(orderId: string): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>(`/order/${orderId}`);
  }

  /**
   * Récupère les données d'une requête spécifique
   */
  public async getRequestData(
    requestId: string,
    params?: {
      format?: 'csv' | 'json';
      pas?: string;
      period?: string;
      since?: string;
      until?: string;
    }
  ): Promise<any> {
    const searchParams = new URLSearchParams();

    if (params?.format) searchParams.append('format', params.format);
    if (params?.pas) searchParams.append('pas', params.pas);
    if (params?.period) searchParams.append('period', params.period);
    if (params?.since) searchParams.append('since', params.since);
    if (params?.until) searchParams.append('until', params.until);

    const url = `${this.config.baseUrl}/request/${requestId}/data?${searchParams.toString()}`;

    // Si format CSV, ne pas utiliser makeRequest qui parse toujours en JSON
    if (params?.format === 'csv') {
      console.log('🌟 Fetching CSV data from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'text/csv',
          'User-Agent': 'ABI-Energie-Simulator/1.0',
          'Origin': 'https://app.switchgrid.tech'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CSV fetch error:', errorText);
        throw new Error(`Erreur lors de la récupération des données CSV: ${response.status}`);
      }

      const csvText = await response.text();
      console.log('✅ CSV data retrieved, length:', csvText.length);
      return csvText;
    }

    // Pour JSON, utiliser makeRequest normal
    return this.makeRequest<any>(
      `/request/${requestId}/data?${searchParams.toString()}`
    );
  }

  /**
   * Crée une commande LOADCURVE spécifique
   * Documentation: POST /order avec type LOADCURVE et direction CONSUMPTION
   */
  public async createLoadCurveOrder(consentId: string): Promise<OrderResponse> {
    console.log('📊 Creating LOADCURVE order with consentId:', consentId);

    const orderRequest: OrderRequest = {
      consentId: consentId,
      requests: [
        {
          type: 'LOADCURVE' as const,
          direction: 'CONSUMPTION' as const,
          enedisRetryAfterLoadcurveActivation: true
        }
      ]
    };

    console.log('📤 LOADCURVE order request:', JSON.stringify(orderRequest, null, 2));

    const order = await this.createOrder(orderRequest);

    console.log('✅ LOADCURVE order created:', {
      orderId: order.id,
      requestId: order.requests?.[0]?.id,
      status: order.status
    });

    return order;
  }

  /**
   * Crée une commande pour récupérer les données LOADCURVE (bouton "Data")
   * Documentation: POST /order avec type LOADCURVE et direction CONSUMPTION
   */
  public async createLoadCurveDataOrder(consentId: string): Promise<OrderResponse> {
    console.log('📊 Creating LOADCURVE Data order with consentId:', consentId);
    console.log('📊 Type: LOADCURVE');
    console.log('📊 Direction: CONSUMPTION');

    const orderRequest: OrderRequest = {
      consentId: consentId,
      requests: [
        {
          type: 'LOADCURVE' as const,
          direction: 'CONSUMPTION' as const,
          enedisRetryAfterLoadcurveActivation: true
        }
      ]
    };

    console.log('📤 LOADCURVE Data order request:', JSON.stringify(orderRequest, null, 2));

    const order = await this.createOrder(orderRequest);

    console.log('✅ LOADCURVE Data order created:');
    console.log('  - Order ID:', order.id);
    console.log('  - Request ID:', order.requests?.[0]?.id);
    console.log('  - Status:', order.status);

    return order;
  }

  /**
   * Récupère les détails d'un contrat incluant le type de compteur (phaseType)
   * Documentation: GET /enedis/v2/contract/{contract_id}/details
   */
  public async getContractDetails(contractId: string): Promise<any> {
    console.log('🔌 Getting contract details for contractId:', contractId);

    const url = `${this.config.baseUrl}/contract/${contractId}/details`;

    console.log('📤 GET request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`Failed to get contract details: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    console.log('✅ Contract details received');
    console.log('📋 Full response:', JSON.stringify(data, null, 2));
    console.log('📋 Phase Type:', data.meters?.[0]?.phaseType || 'N/A');

    return data;
  }
}

export const switchgridApi = SwitchgridApi.getInstance();