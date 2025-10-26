import React, { useEffect, useState, useRef } from 'react';
import { createC68Order } from '../../utils/api/switchgridC68Api';
import { useContractDetails } from '../../hooks/useContractDetails';
import ContractDetailsDisplay from './ContractDetailsDisplay';
import { Loader2, AlertCircle } from 'lucide-react';

interface ContractInfoSectionProps {
  consentId: string;
  prm: string;
}

export function ContractInfoSection({ consentId, prm }: ContractInfoSectionProps) {
  const [fetchingNewData, setFetchingNewData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const hasAttemptedFetchRef = useRef(false);

  // Utiliser le hook pour récupérer depuis la base de données
  const { contractDetails, loading: dbLoading, error: dbError } = useContractDetails(prm);

  // Si pas de données en base, appeler l'API C68
  useEffect(() => {
    // Ne rien faire si on a déjà des données, si on charge, ou si on a déjà tenté
    if (contractDetails || dbLoading || hasAttemptedFetchRef.current) {
      return;
    }

    const fetchC68Data = async () => {
      hasAttemptedFetchRef.current = true;
      setFetchingNewData(true);
      setFetchError(null);

      try {
        console.log('📄 [ContractInfoSection] Pas de données C68 en cache, appel API...');
        console.log('📄 [ContractInfoSection] PRM:', prm);
        console.log('📄 [ContractInfoSection] Consent ID:', consentId);

        const result = await createC68Order({
          prm,
          consent_id: consentId
        });

        console.log('✅ [ContractInfoSection] Réponse C68 reçue:', result);
        console.log('✅ [ContractInfoSection] Données C68 sauvegardées');

        // Attendre que Supabase se mette à jour
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Forcer un re-fetch du hook en rechargeant la page
        window.location.reload();
      } catch (err: any) {
        console.error('❌ [ContractInfoSection] Erreur:', err);
        setFetchError(err.message || 'Erreur lors de la récupération des données de contrat');
      } finally {
        setFetchingNewData(false);
      }
    };

    fetchC68Data();
  }, [prm, consentId, contractDetails, dbLoading]);

  // Affichage du loader
  if (dbLoading || fetchingNewData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {fetchingNewData
                ? 'Récupération de vos données de contrat...'
                : 'Chargement des données de contrat...'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Cette opération peut prendre quelques secondes
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Affichage des erreurs
  if (dbError || fetchError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Erreur de récupération
            </h3>
            <p className="text-red-700">{dbError || fetchError}</p>
          </div>
        </div>
      </div>
    );
  }

  // Affichage des données avec le composant existant
  if (contractDetails) {
    return (
      <ContractDetailsDisplay
        contractData={contractDetails.contract_data}
        tariffType={contractDetails.tariff_type}
        formulaCode={contractDetails.formula_code}
        updatedAt={contractDetails.updated_at}
      />
    );
  }

  // Fallback
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            Aucune donnée disponible
          </h3>
          <p className="text-amber-800">
            Les données de contrat ne sont pas encore disponibles pour ce compteur.
          </p>
        </div>
      </div>
    </div>
  );
}
