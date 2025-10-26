import React, { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle, ExternalLink, Loader2, AlertCircle, FileDown, Maximize, Minimize } from 'lucide-react';
import { ElectricityContract, Ask } from '../../types/switchgrid';
import { useSwitchgrid } from '../../hooks/useSwitchgrid';
import { useClient } from '../../contexts/client';

interface ConsentFormProps {
  contract: ElectricityContract;
  onConsentAccepted: (ask: Ask) => void;
  onBack: () => void;
}

export default function ConsentForm({ contract, onConsentAccepted, onBack }: ConsentFormProps) {
  const { clientInfo } = useClient();
  const { 
    loading, 
    error, 
    currentAsk, 
    createAsk, 
    checkAskStatus, 
    downloadAskProof,
    setError 
  } = useSwitchgrid();
  
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isIframeExpanded, setIsIframeExpanded] = useState(false);

  // Nettoyer l'intervalle de polling au démontage
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Fonction pour mapper la civilité vers le format attendu par Switchgrid
  const mapCiviliteToGenre = (civilite: string): 'M' | 'F' | null => {
    const normalizedCivilite = civilite.toLowerCase().trim();
    if (normalizedCivilite === 'monsieur' || normalizedCivilite === 'm.' || normalizedCivilite === 'm') {
      return 'M';
    }
    if (normalizedCivilite === 'madame' || normalizedCivilite === 'mme' || normalizedCivilite === 'mme.' || normalizedCivilite === 'f') {
      return 'F';
    }
    return null;
  };

  // Fonction pour valider les données client
  const validateClientInfo = () => {
    const errors: string[] = [];

    if (!clientInfo.nom || clientInfo.nom.trim() === '') {
      errors.push('Le nom est requis');
    }

    if (!clientInfo.prenom || clientInfo.prenom.trim() === '') {
      errors.push('Le prénom est requis');
    }

    if (!clientInfo.email || clientInfo.email.trim() === '') {
      errors.push('L\'email est requis');
    } else {
      // Validation basique de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientInfo.email.trim())) {
        errors.push('L\'email n\'est pas valide');
      }
    }

    if (!clientInfo.telephone || clientInfo.telephone.trim() === '') {
      errors.push('Le téléphone est requis');
    }

    const genre = mapCiviliteToGenre(clientInfo.civilite || '');
    if (!genre) {
      errors.push('La civilité doit être "Monsieur" ou "Madame"');
    }

    return errors;
  };

  const handleCreateConsent = async () => {
    setValidationError(null);
    
    try {
      // Structure simplifiée selon la documentation Switchgrid
      const askRequest = {
        electricityContracts: [contract.id],
        consentCollectionMedium: {
          service: 'WEB_HOSTED' as const
        },
        purposes: ['SOLAR_INSTALLATION_SIZING' as const]
      };

      console.log('📝 Requête de consentement préparée:', JSON.stringify(askRequest, null, 2));

      const ask = await createAsk(askRequest);
      
      // Si le consentement nécessite une action utilisateur, démarrer le polling
      if (ask.status === 'PENDING_USER_ACTION' && ask.consentCollectionDetails?.userUrl) {
        startPolling(ask.id);
      } else if (ask.status === 'ACCEPTED') {
        // Sauvegarder le Ask accepté dans localStorage pour les tests
        localStorage.setItem('lastAcceptedAsk', JSON.stringify(ask));
        onConsentAccepted(ask);
      }
    } catch (err) {
      // L'erreur est déjà gérée par le hook
    }
  };

  const startPolling = (askId: string) => {
    setIsPolling(true);
    
    const interval = setInterval(async () => {
      try {
        const updatedAsk = await checkAskStatus(askId);

        if (updatedAsk.status === 'ACCEPTED') {
          clearInterval(interval);
          setIsPolling(false);
          setPollingInterval(null);
          // Sauvegarder le Ask accepté dans localStorage pour les tests
          localStorage.setItem('lastAcceptedAsk', JSON.stringify(updatedAsk));
          onConsentAccepted(updatedAsk);
        } else if (updatedAsk.status === 'ADDRESS_CHECK_FAILED') {
          clearInterval(interval);
          setIsPolling(false);
          setPollingInterval(null);
          setError('Vérification d\'adresse échouée. Veuillez vérifier les informations du contrat.');
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du statut:', err);
      }
    }, 3000); // Vérifier toutes les 3 secondes
    
    setPollingInterval(interval);
  };

  const handleDownloadProof = async () => {
    if (!currentAsk?.id) return;
    
    try {
      await downloadAskProof(currentAsk.id);
    } catch (err) {
      // L'erreur est déjà gérée par le hook
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'text-green-600';
      case 'PENDING_USER_ACTION': return 'text-blue-600';
      case 'ADDRESS_CHECK_FAILED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CREATED': return 'Créé';
      case 'PENDING_ADDRESS_CHECK': return 'Vérification adresse';
      case 'ADDRESS_CHECK_FAILED': return 'Adresse invalide';
      case 'PREPARING_CONSENT_COLLECTION': return 'Préparation';
      case 'PENDING_USER_ACTION': return 'En attente de signature';
      case 'ACCEPTED': return 'Accepté';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Étape 2 : Consentement pour l'accès aux données
        </h3>

        {/* Informations du contrat sélectionné */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Contrat sélectionné</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <p><strong>Titulaire :</strong> {contract.nomClientFinalOuDenominationSociale}</p>
            <p><strong>Adresse :</strong> {contract.adresseInstallationNormalisee.ligne6}</p>
            <p><strong>PRM :</strong> {contract.prm}</p>
            <p><strong>Type :</strong> {contract.categorieClientFinalCode === 'RES' ? 'Particulier' : 'Professionnel'}</p>
          </div>
        </div>

        {/* Informations sur le consentement */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-gray-900">Données qui seront collectées</h4>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• <strong>Données contractuelles</strong> : Informations de votre contrat</li>
            <li>• <strong>Consommation quotidienne</strong> : Historique sur 12 mois</li>
            <li>• <strong>Courbe de charge</strong> : Profil de consommation détaillé</li>
            <li>• <strong>Puissances maximales</strong> : Pics de consommation</li>
          </ul>
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>🔒 Sécurisé et conforme RGPD</strong> - Vos données sont protégées et utilisées uniquement pour le dimensionnement de votre installation solaire.
            </p>
          </div>
        </div>

        {!currentAsk ? (
          <div className="space-y-4">
            <button
              onClick={handleCreateConsent}
              disabled={loading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Génération du consentement...</span>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  <span>Générer le formulaire de consentement</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Statut du consentement */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Statut du consentement</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentAsk.status)}`}>
                  {getStatusLabel(currentAsk.status)}
                </span>
              </div>
              
              {currentAsk.status === 'PENDING_USER_ACTION' && currentAsk.consentCollectionDetails?.userUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <h5 className="font-medium text-blue-900">Formulaire de consentement</h5>
                    <button
                      onClick={() => setIsIframeExpanded(!isIframeExpanded)}
                      className="ml-auto p-1 rounded hover:bg-blue-100 transition-colors"
                      title={isIframeExpanded ? "Réduire" : "Agrandir"}
                    >
                      {isIframeExpanded ? (
                        <Minimize className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Maximize className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-blue-800 mb-4">
                    Veuillez remplir et signer le formulaire de consentement ci-dessous :
                  </p>
                  
                  {/* Iframe intégrée pour le formulaire de consentement */}
                  {/* Solution 1: Iframe avec gestion d'erreur */}
                  <div className="space-y-4">
                    <div className={`relative bg-white border border-gray-300 rounded-lg overflow-hidden ${
                      isIframeExpanded ? 'h-screen' : 'h-96'
                    }`}>
                      <iframe
                        src={currentAsk.consentCollectionDetails.userUrl}
                        className="w-full h-full"
                        title="Formulaire de consentement Switchgrid"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                        referrerPolicy="strict-origin-when-cross-origin"
                        onError={(e) => {
                          console.warn('Iframe loading error:', e);
                          // Fallback automatique vers l'ouverture externe
                          window.open(currentAsk.consentCollectionDetails.userUrl, '_blank');
                        }}
                        onLoad={(e) => {
                          console.log('Iframe loaded successfully');
                          // Vérifier si l'iframe a bien chargé le contenu
                          try {
                            const iframe = e.target as HTMLIFrameElement;
                            // Test d'accès au contenu (peut échouer à cause de CORS)
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                            if (!iframeDoc) {
                              console.warn('Cannot access iframe content - likely blocked by CORS');
                            }
                          } catch (corsError) {
                            console.warn('CORS restriction detected:', corsError);
                          }
                        }}
                      />
                      
                      {/* Overlay de fallback en cas d'échec */}
                      <div 
                        id="iframe-fallback"
                        className="absolute inset-0 bg-gray-100 flex items-center justify-center hidden"
                      >
                        <div className="text-center p-6">
                          <ExternalLink className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                          <h5 className="text-lg font-medium text-gray-900 mb-2">
                            Ouverture externe requise
                          </h5>
                          <p className="text-sm text-gray-600 mb-4">
                            Le formulaire ne peut pas s'afficher dans cette fenêtre pour des raisons de sécurité.
                          </p>
                          <a
                            href={currentAsk.consentCollectionDetails.userUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <ExternalLink className="h-5 w-5" />
                            Ouvrir le formulaire
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    {/* Boutons d'action */}
                    <div className="flex justify-between items-center">
                      <a
                        href={currentAsk.consentCollectionDetails.userUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir dans un nouvel onglet
                      </a>
                      
                      <div className="text-sm text-gray-500">
                        Le formulaire se charge automatiquement ci-dessus
                      </div>
                    </div>
                  </div>
                  
                  {isPolling && (
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>En attente de votre signature dans l'onglet ouvert...</span>
                    </div>
                  )}
                </div>
              )}

              {currentAsk.status === 'ACCEPTED' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h5 className="font-medium text-green-900">Consentement accepté</h5>
                  </div>
                  <p className="text-sm text-green-800 mb-4">
                    Parfait ! Nous pouvons maintenant accéder à vos données de consommation.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDownloadProof}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      <FileDown className="h-4 w-4" />
                      Télécharger la preuve
                    </button>
                    <button
                      onClick={() => {
                        // Sauvegarder le Ask accepté dans localStorage pour les tests
                        localStorage.setItem('lastAcceptedAsk', JSON.stringify(currentAsk));
                        onConsentAccepted(currentAsk);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Continuer vers les données
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {validationError && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium mb-2">Informations client requises</p>
              <pre className="text-sm text-yellow-700 whitespace-pre-line">{validationError}</pre>
              <p className="text-sm text-yellow-700 mt-2">
                Veuillez compléter vos informations dans les étapes précédentes avant de continuer.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}