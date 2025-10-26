import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ContractDetails {
  id: string;
  user_id: string;
  pdl: string;
  contract_data: any;
  tariff_type?: string;
  tariff_structure?: any;
  formula_code?: string;
  source_order_id?: string;
  created_at: string;
  updated_at: string;
}

export function useContractDetails(pdl: string | null) {
  const [contractDetails, setContractDetails] = useState<ContractDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdl || pdl.length !== 14) {
      setContractDetails(null);
      setError(null);
      return;
    }

    const fetchContractDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🔍 useContractDetails - Recherche pour PDL:', pdl);

        // Récupérer depuis la table switchgrid_contract_details
        const { data, error: supabaseError } = await supabase
          .from('switchgrid_contract_details')
          .select('*')
          .eq('pdl', pdl)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('🔍 useContractDetails - Résultat Supabase:', { data, error: supabaseError });

        if (supabaseError) {
          console.error('❌ useContractDetails - Erreur Supabase:', supabaseError);
          throw supabaseError;
        }

        if (data) {
          console.log('✅ useContractDetails - Données trouvées:', data);
          console.log('🔍 contract_data type:', typeof data.contract_data);
          console.log('🔍 contract_data contenu:', data.contract_data);
          setContractDetails(data);
        } else {
          console.log('⚠️ useContractDetails - Aucune donnée trouvée pour ce PDL');
          setContractDetails(null);
        }
      } catch (err: any) {
        console.error('Erreur récupération détails contrat:', err);
        setError(err.message || 'Erreur lors de la récupération des détails du contrat');
        setContractDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContractDetails();
  }, [pdl]);

  return { contractDetails, loading, error };
}
