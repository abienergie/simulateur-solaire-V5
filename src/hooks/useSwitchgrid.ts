import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { switchgridApi } from '../utils/api/switchgridApi';
import { 
  ElectricityContract, 
  Ask, 
  OrderResponse, 
  SearchContractParams,
  CreateAskRequest,
  OrderRequest
} from '../types/switchgrid';

export function useSwitchgrid() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ElectricityContract[]>([]);
  const [currentAsk, setCurrentAsk] = useState<Ask | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null);

  const searchContract = useCallback(async (params: SearchContractParams) => {
    console.log('🚀 Starting contract search with params:', params);
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Recherche de contrat Switchgrid:', params);
      const response = await switchgridApi.searchContract(params);
      
      console.log('✅ Contrats trouvés:', response.results.length);
      console.log('📋 Contract details:', response.results);
      setContracts(response.results);
      
      return response.results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la recherche';
      console.error('❌ Erreur recherche contrat:', errorMessage);
      console.error('❌ Full error object:', err);
      setError(errorMessage);
      setContracts([]);
      throw err;
    } finally {
      console.log('🏁 Search contract completed, setting loading to false');
      setLoading(false);
    }
  }, []);

  const searchContractsFromInvoices = useCallback(async (files: File[]) => {
    console.log('🚀 Début analyse de factures:', files.length, 'fichiers');
    setLoading(true);
    setError(null);
    
    try {
      // Pour l'instant, désactiver l'upload de factures car l'API Switchgrid a des problèmes CORS
      throw new Error(
        'L\'analyse automatique de factures est temporairement indisponible. ' +
        'Veuillez utiliser la recherche manuelle avec le nom du titulaire et l\'adresse.'
      );
      
      const responseData = null;
      console.log('✅ Analyse de factures réussie:', responseData);
      
      // Extraire tous les contrats trouvés
      const allContracts: ElectricityContract[] = [];
      
      // Gérer différents formats de réponse
      if (responseData?.results && Array.isArray(responseData.results)) {
        // Format direct avec tableau de contrats
        allContracts.push(...responseData.results);
      } else if (responseData?.resultsByFile && Array.isArray(responseData.resultsByFile)) {
        // Format avec résultats par fichier
        responseData.resultsByFile.forEach((result: any) => {
          if (result.contracts && Array.isArray(result.contracts)) {
            allContracts.push(...result.contracts);
          }
        });
      } else if (responseData?.contracts && Array.isArray(responseData.contracts)) {
        // Format avec contrats directement
        allContracts.push(...responseData.contracts);
      } else {
        console.warn('⚠️ Format de réponse inattendu:', responseData);
        throw new Error('Format de réponse inattendu de l\'API. Veuillez utiliser la recherche manuelle.');
      }
      
      if (allContracts.length === 0) {
        console.log('⚠️ Aucun contrat trouvé dans les factures');
        setError(
          'Aucun contrat n\'a pu être extrait des factures. ' +
          'Vérifiez que les fichiers sont lisibles et contiennent bien des informations de contrat Enedis. ' +
          'Vous pouvez essayer la recherche manuelle.'
        );
      } else {
        console.log('✅ Contrats trouvés via OCR:', allContracts.length);
        setContracts(allContracts);
       }
      
      return responseData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'analyse des factures';
      console.error('❌ Erreur OCR factures:', errorMessage);
      setError(errorMessage);
      setContracts([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAsk = useCallback(async (request: CreateAskRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Création demande de consentement:', request);
      const ask = await switchgridApi.createAsk(request);
      
      console.log('✅ Demande créée:', ask.id, 'Status:', ask.status);
      setCurrentAsk(ask);
      
      return ask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création de la demande';
      console.error('❌ Erreur création Ask:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAskStatus = useCallback(async (askId: string) => {
    try {
      const ask = await switchgridApi.getAsk(askId);
      setCurrentAsk(ask);
      return ask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification du statut';
      console.error('❌ Erreur vérification Ask:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const createOrder = useCallback(async (request: OrderRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Commande de données:', request);
      
      // Utiliser l'Edge Function pour l'étape 3
      const { data, error } = await supabase.functions.invoke('switchgrid-orders', {
        method: 'POST',
        body: {
          action: 'create_order',
          orderRequest: request
        }
      });

      if (error) {
        console.error('❌ Erreur Edge Function create_order:', error);
        throw new Error(`Échec création commande: ${error.message}`);
      }

      const order = data;
      
      console.log('✅ Commande créée:', order.id, 'Status:', order.status);
      setCurrentOrder(order);
      
      return order;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la commande des données';
      console.error('❌ Erreur création Order:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkOrderStatus = useCallback(async (orderId: string) => {
    try {
      // Utiliser l'Edge Function pour l'étape 3
      const { data, error } = await supabase.functions.invoke('switchgrid-orders', {
        method: 'POST',
        body: {
          action: 'get_order',
          orderId: orderId
        }
      });
      
      if (error) {
        console.error('❌ Erreur Edge Function get_order:', error);
        throw new Error(`Échec vérification commande: ${error.message}`);
      }
      
      const order = data;
      setCurrentOrder(order);
      return order;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification de la commande';
      console.error('❌ Erreur vérification Order:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getRequestData = useCallback(async (
    requestId: string,
    requestType: string,
    params?: {
      period?: '5min' | '10min' | '15min' | '30min' | '1h' | '1d';
      pas?: string;
      format?: 'csv' | 'json';
      since?: string;
      until?: string;
      prm?: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📈 Récupération données requête:', requestId, 'Type:', requestType, 'Params:', params);
      console.log('📈 Params détaillés:', JSON.stringify(params, null, 2));

      // Utiliser l'Edge Function pour l'étape 3
      const { data, error } = await supabase.functions.invoke('switchgrid-orders', {
        method: 'POST',
        body: {
          action: 'get_request_data',
          requestId: requestId,
          requestType: requestType,
          params: params || {}
        }
      });

      if (error) {
        console.error('❌ Erreur Edge Function get_request_data:', error);
        console.error('📦 Data reçue avec l\'erreur:', data);

        // Si data contient un message d'erreur détaillé, l'utiliser
        const detailedError = data?.error || error.message;
        throw new Error(`Échec récupération données: ${detailedError}`);
      }

      console.log('✅ Données récupérées pour requête:', requestId);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la récupération des données';
      console.error('❌ Erreur récupération données:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadAskProof = useCallback(async (askId: string) => {
    try {
      console.log('📄 Téléchargement preuve consentement:', askId);
      const blob = await switchgridApi.getAskProof(askId);
      
      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `consentement-${askId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ Preuve téléchargée');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du téléchargement';
      console.error('❌ Erreur téléchargement preuve:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const saveOrderData = useCallback(async (
    pdl: string,
    orderData: OrderResponse,
    allRequestsData: any
  ) => {
    setLoading(true);
    setError(null);

    try {
      console.log('💾 Sauvegarde des données dans Supabase:', pdl);

      const { data, error } = await supabase.functions.invoke('switchgrid-orders', {
        method: 'POST',
        body: {
          action: 'save_order_data',
          pdl: pdl,
          orderData: orderData,
          allRequestsData: allRequestsData
        }
      });

      if (error) {
        console.error('❌ Erreur Edge Function save_order_data:', error);
        throw new Error(`Échec sauvegarde: ${error.message}`);
      }

      console.log('✅ Données sauvegardées avec succès:', data.stats);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des données';
      console.error('❌ Erreur sauvegarde données:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setContracts([]);
    setCurrentAsk(null);
    setCurrentOrder(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    contracts,
    currentAsk,
    currentOrder,
    searchContract,
    searchContractsFromInvoices,
    createAsk,
    checkAskStatus,
    createOrder,
    checkOrderStatus,
    getRequestData,
    saveOrderData,
    downloadAskProof,
    reset,
    setError
  };
}