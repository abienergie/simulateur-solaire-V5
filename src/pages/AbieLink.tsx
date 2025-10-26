import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Zap, Info, Search, AlertCircle, Loader2, CheckCircle, RefreshCw, BarChart2, Calendar, User, FileText, Lock, Bug, Database, ExternalLink, Download, ChevronDown } from 'lucide-react';
import { useEnedisData } from '../hooks/useEnedisData';
import { useContractDetails } from '../hooks/useContractDetails';
import EnhancedConsumptionChart from '../components/EnhancedConsumptionChart';
import EnedisInfoDisplay from '../components/EnedisInfoDisplay';
import AnnualLoadCurveDisplay from '../components/AnnualLoadCurveDisplay';
import AnnualConsumptionChart from '../components/AnnualConsumptionChart';
import DailyAveragePowerCurve from '../components/DailyAveragePowerCurve';
import AnnualLoadCurveTimeline from '../components/AnnualLoadCurveTimeline';
import ConsumptionAnalysisChart from '../components/ConsumptionAnalysisChart';
import ContractDetectionChart from '../components/ContractDetectionChart';
import MaxPowerAnalysisChart from '../components/MaxPowerAnalysisChart';
import LoadingProgressBar from '../components/LoadingProgressBar';
import DataRetrieval from '../components/switchgrid/DataRetrieval';
import ContractDetailsDisplay from '../components/switchgrid/ContractDetailsDisplay';
import { useLocation } from 'react-router-dom';
import { enedisApi } from '../utils/api/enedisApi';
import type { Ask } from '../types/switchgrid';
import { savedMetersApi, SavedMeter } from '../utils/api/savedMetersApi';

// Mock Ask pour tests - PDL 14862373311505 avec les VRAIS IDs (défini en dehors du composant)
const mockAskForTesting: Ask = {
    id: 'd020f4fa-aba3-47a1-8f95-1b26f9d42974',
    createdAt: new Date().toISOString(),
    status: 'ACCEPTED',
    acceptedAt: new Date().toISOString(),
    consentCollectionDetails: null,
    createArgs: {
      electricityContracts: ['4092e43a-8f21-5e35-968a-dcd9ee1a9c94'],
      purposes: ['SOLAR_INSTALLATION_SIZING']
    },
    addressCheckResults: {},
    consentIds: { '4092e43a-8f21-5e35-968a-dcd9ee1a9c94': '334be8a8-a600-4d09-b0ec-ea034a5be41d' },
    contracts: [{
      id: '4092e43a-8f21-5e35-968a-dcd9ee1a9c94',
      prm: '14862373311505',
      categorieClientFinalCode: 'RES',
      nomClientFinalOuDenominationSociale: 'Client Test',
      adresseInstallationNormalisee: {
        ligne6: 'Adresse du PDL 14862373311505'
      }
    }],
    scopes: [
      {
        id: 'DETAILS_CONTRACTUELS'
      },
      {
        id: 'CONSUMPTION_DATA',
        args: {
          types: ['ENERGIE', 'PMAX'],
          directions: ['SOUTIRAGE']
        }
      },
      {
        id: 'ELECTRICITY_TIMESERIES',
        args: {
          types: ['LOADCURVE'],
          directions: ['CONSUMPTION']
        }
      }
    ],
  purposes: ['SOLAR_INSTALLATION_SIZING'],
  testEnvironment: true,
  thirdPartyRecipients: []
};

const AbieLink: React.FC = () => {
  const location = useLocation();
  const [pdl, setPdl] = useState('');
  const [activeView, setActiveView] = useState<'info' | 'consumption' | 'loadCurve' | 'production'>('info');
  const [additionalInfo, setAdditionalInfo] = useState<any>(null);
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('PT30M');
  const [isDownloading, setIsDownloading] = useState(false);
  const [displayMaxPowerData, setDisplayMaxPowerData] = useState<any[]>([]);
  const [useSwitchgrid, setUseSwitchgrid] = useState(false);
  const [lastAcceptedAsk, setLastAcceptedAsk] = useState<Ask | null>(null);
  const [savedMeters, setSavedMeters] = useState<SavedMeter[]>([]);
  const [showMeterDropdown, setShowMeterDropdown] = useState(false);

  const {
    data,
    isLoading,
    isSectionLoading,
    error,
    success,
    setError,
    setSuccess,
    dataSource,
    progress,
    stage,
    fetchAllData,
    displayConsumptionData,
    displayLoadCurveData,
    displayMaxPowerData,
    getAnnualLoadCurveData,
    hpHcTotals,
    hpHcMonthly,
    hpHcWeekly
  } = useEnedisData();

  // Hook pour récupérer les détails du contrat C68
  const { contractDetails, loading: contractLoading, error: contractError } = useContractDetails(pdl || null);

  // Charger les compteurs sauvegardés
  useEffect(() => {
    const loadSavedMeters = async () => {
      try {
        const meters = await savedMetersApi.getAll();
        setSavedMeters(meters);
      } catch (error) {
        console.error('Error loading saved meters:', error);
      }
    };
    loadSavedMeters();
  }, []);

  // Load PDL and last accepted Ask from localStorage on component mount
  useEffect(() => {
    const storedPdl = localStorage.getItem('enedis_usage_point_id');
    if (storedPdl) {
      setPdl(storedPdl);
    }

    // Pour les tests: Charger le dernier Ask accepté depuis localStorage OU utiliser le mock
    const storedAsk = localStorage.getItem('lastAcceptedAsk');
    if (storedAsk) {
      try {
        const ask = JSON.parse(storedAsk);
        setLastAcceptedAsk(ask);
        // Activer automatiquement le mode Switchgrid si un Ask existe
        setUseSwitchgrid(true);
      } catch (e) {
        console.error('Erreur lors du parsing du lastAcceptedAsk:', e);
        // Fallback sur le mock en cas d'erreur
        setLastAcceptedAsk(mockAskForTesting);
        setUseSwitchgrid(true);
      }
    } else {
      // Si pas de Ask stocké, utiliser le mock par défaut pour le PDL 14862373311505
      console.log('📦 Chargement du mock Ask pour tests:', mockAskForTesting);
      setLastAcceptedAsk(mockAskForTesting);
      setUseSwitchgrid(true);
    }

    // Check for success/error messages from navigation state
    if (location.state?.success) {
      setSuccess(location.state.message || 'Opération réussie');
    }
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location.state, setSuccess, setError]);

  const handlePdlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    setPdl(value);
  };

  const handleSelectSavedMeter = async (meter: SavedMeter) => {
    setShowMeterDropdown(false);

    // Mettre à jour le PDL
    setPdl(meter.prm);
    localStorage.setItem('enedis_usage_point_id', meter.prm);

    // Reconstruire l'objet Ask depuis les données sauvegardées
    const reconstructedAsk: Ask = {
      id: meter.ask_id,
      createdAt: meter.created_at,
      status: 'ACCEPTED',
      acceptedAt: meter.created_at,
      consentCollectionDetails: null,
      createArgs: {
        electricityContracts: [meter.contract_id],
        purposes: ['SOLAR_INSTALLATION_SIZING']
      },
      addressCheckResults: {},
      consentIds: { [meter.contract_id]: meter.consent_id },
      contracts: [{
        id: meter.contract_id,
        prm: meter.prm,
        categorieClientFinalCode: 'RES',
        nomClientFinalOuDenominationSociale: meter.label || 'Client',
        adresseInstallationNormalisee: {
          ligne6: `PDL ${meter.prm}`
        }
      }],
      scopes: [
        {
          id: 'DETAILS_CONTRACTUELS'
        },
        {
          id: 'CONSUMPTION_DATA',
          args: {
            types: ['ENERGIE', 'PMAX'],
            directions: ['SOUTIRAGE']
          }
        },
        {
          id: 'ELECTRICITY_TIMESERIES',
          args: {
            types: ['LOADCURVE'],
            directions: ['CONSUMPTION']
          }
        }
      ],
      purposes: ['SOLAR_INSTALLATION_SIZING'],
      testEnvironment: true,
      thirdPartyRecipients: []
    };

    setLastAcceptedAsk(reconstructedAsk);
    localStorage.setItem('lastAcceptedAsk', JSON.stringify(reconstructedAsk));
    setUseSwitchgrid(true);

    // Mettre à jour la date de dernière utilisation
    try {
      await savedMetersApi.updateLastUsed(meter.prm);
      const meters = await savedMetersApi.getAll();
      setSavedMeters(meters);
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  };

  const handleFetchAllData = async (pdlToUse: string) => {
    if (pdlToUse.length !== 14) {
      setError('Le PDL doit comporter 14 chiffres');
      return;
    }

    // Save PDL to localStorage
    localStorage.setItem('enedis_usage_point_id', pdlToUse);
    
    setError(null);
    setSuccess(null);

    try {
      console.log('🔄 Début de la récupération complète des données pour PDL:', pdlToUse);
      
      // Appeler fetchAllData du hook qui va récupérer toutes les données
      await fetchAllData(pdlToUse);
      
      // Synchroniser les données de puissance max
      setDisplayMaxPowerData(displayMaxPowerData);
      
      // Récupérer les données client depuis Supabase après fetchAllData
      try {
        const [identity, address, contract, contact] = await Promise.all([
          enedisApi.getClientIdentityFromSupabase(pdlToUse),
          enedisApi.getClientAddressFromSupabase(pdlToUse),
          enedisApi.getClientContractFromSupabase(pdlToUse),
          enedisApi.getClientContactFromSupabase(pdlToUse),
        ]);
        
        // Construire l'objet complet avec toutes les données
        const completeClientData = {
          identity: identity,
          address: address,
          contract: contract,
          contact: contact
        };
        
        setAdditionalInfo(completeClientData);
        setError(null);
      } catch (supabaseError) {
        console.error('Erreur lors de la récupération des données client depuis Supabase:', supabaseError);
      }

      setSuccess('Toutes les données ont été récupérées avec succès');
      setActiveView('info');
    } catch (err) {
      console.error('Erreur lors de la récupération des données:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération des données');
    }
  };

  const handleLoadCurveTabClick = () => {
    setActiveView('loadCurve');

    // Incrémenter le compteur de clics pour le debug
    const newCount = debugClickCount + 1;
    setDebugClickCount(newCount);

    // Activer le debug après 5 clics
    if (newCount >= 5) {
      setShowDebug(true);
    }

    // Reset du compteur après 10 secondes d'inactivité
    setTimeout(() => {
      setDebugClickCount(0);
    }, 10000);
  };

  const handleDownloadLoadCurve = async () => {
    if (displayLoadCurveData.length === 0) {
      setError('Aucune donnée de courbe de charge à télécharger');
      return;
    }

    setIsDownloading(true);
    try {
      console.log('📥 Téléchargement courbe de charge:', {
        dataPoints: displayLoadCurveData.length,
        period: selectedPeriod
      });

      // Créer le CSV à partir des données
      const headers = ['Date', 'Heure', 'Date/Heure', 'Puissance (kW)', 'Heures Creuses'];
      const csvRows = [headers.join(',')];

      displayLoadCurveData.forEach(point => {
        const row = [
          point.date || '',
          point.time || '',
          point.date_time || '',
          point.value || '0',
          point.is_off_peak ? 'Oui' : 'Non'
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');

      // Créer et télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `courbe_de_charge_${pdl}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Téléchargement réussi');
      setSuccess('Courbe de charge téléchargée avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('❌ Erreur téléchargement:', err);
      setError('Erreur lors du téléchargement de la courbe de charge');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* En-tête avec logo Enedis et dégradé inversé */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-400 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between text-white mb-4">
          <div className="flex items-center gap-3">
            <LinkIcon className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Abie Link</h1>
          </div>
          <div className="flex items-center">
            <img 
              src="https://xpxbxfuckljqdvkajlmx.supabase.co/storage/v1/object/public/graphique/Enedis-signature_couleur_RVB_72-dpi.png"
              alt="Enedis"
              className="h-12 w-auto"
            />
          </div>
        </div>
        <p className="text-blue-100">
          Connectez-vous à votre compteur Linky pour analyser votre consommation et optimiser votre installation solaire
        </p>
      </div>

      {/* Toggle Switchgrid pour tests - Toujours visible */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm p-4 mb-8 border-2 border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Mode Test Switchgrid</h3>
              <p className="text-sm text-gray-600">
                {lastAcceptedAsk ? (
                  <>Consentement détecté pour le PDL {lastAcceptedAsk.contracts[0]?.prm} - Skip étapes 1 et 2</>
                ) : (
                  <>Chargement du consentement pour tests...</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setUseSwitchgrid(!useSwitchgrid)}
            disabled={!lastAcceptedAsk}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              useSwitchgrid
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {useSwitchgrid ? 'Mode Switchgrid activé' : 'Activer Switchgrid'}
          </button>
        </div>
      </div>

      {/* Section explicative avec image compteur Linky */}
      {!useSwitchgrid && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Comment utiliser Abie Link ?
          </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-gray-900">Créer votre compte Enedis</h3>
                  <a 
                    href="https://mon-compte-client.enedis.fr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-sm text-gray-600">
                  Rendez-vous sur le site Enedis pour créer votre compte client et y rattacher votre PDL (Point de Livraison).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-gray-900">Donner consentement à Abie Link</h3>
                  <a 
                    href="https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize?client_id=Y_LuB7HsQW3JWYudw7HRmN28FN8a&duration=P1Y&response_type=code&state=AbieLink1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-sm text-gray-600">
                  Autorisez Abie Link à accéder à vos données de consommation via l'API sécurisée d'Enedis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Charger vos données de consommation</h3>
                <p className="text-sm text-gray-600">
                  Utilisez le formulaire ci-dessous pour récupérer et analyser vos données de consommation annuelle.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center ml-12 mt-4">
            <img 
              src="https://xpxbxfuckljqdvkajlmx.supabase.co/storage/v1/object/public/graphique/PH709_071.png"
              alt="Compteur Linky"
              className="max-w-full h-auto rounded-lg shadow-md"
            />
          </div>
        </div>
        </div>
      )}

      {/* Si mode Switchgrid activé, afficher directement le composant DataRetrieval */}
      {useSwitchgrid && lastAcceptedAsk && (
        <div className="mb-8">
          {/* Affichage du contract_id pour les tests */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-yellow-900">
                🔑 Informations de consentement (pour tests)
              </h3>
              <div className="relative">
                <button
                  onClick={() => setShowMeterDropdown(!showMeterDropdown)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                >
                  <span>{savedMeters.length > 0 ? `Changer de PDL (${savedMeters.length})` : 'Aucun PDL sauvegardé'}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMeterDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showMeterDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                    <div className="p-3 border-b bg-gray-50 sticky top-0">
                      <p className="text-sm font-semibold text-gray-700">
                        {savedMeters.length > 0 ? 'Compteurs enregistrés' : 'Aucun compteur'}
                      </p>
                    </div>
                    {savedMeters.length > 0 ? (
                      savedMeters.map((meter) => (
                        <button
                          key={meter.id}
                          onClick={() => handleSelectSavedMeter(meter)}
                          className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                            meter.prm === lastAcceptedAsk.contracts[0]?.prm ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-bold text-gray-900">{meter.prm}</span>
                                {meter.prm === lastAcceptedAsk.contracts[0]?.prm && (
                                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-semibold">Actuel</span>
                                )}
                              </div>
                              {meter.label && (
                                <p className="text-xs text-gray-600 mb-1">{meter.label}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {meter.last_used_at
                                  ? `Utilisé le ${new Date(meter.last_used_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                  : `Créé le ${new Date(meter.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
                                }
                              </p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-sm text-gray-600 mb-3">Aucun compteur sauvegardé pour le moment.</p>
                        <p className="text-xs text-gray-500">
                          Allez sur <span className="font-semibold">Switchgrid Link</span> et acceptez un consentement pour sauvegarder un compteur.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <span className="text-yellow-700 font-semibold">Ask ID:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {lastAcceptedAsk.id}
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-semibold">Contract ID:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {lastAcceptedAsk.contracts[0]?.id || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-semibold">Consent ID:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {Object.values(lastAcceptedAsk.consentIds)[0] || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-semibold">PRM:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {lastAcceptedAsk.contracts[0]?.prm || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-semibold">Status:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {lastAcceptedAsk.status}
                </div>
              </div>
            </div>
            {lastAcceptedAsk.id === 'd020f4fa-aba3-47a1-8f95-1b26f9d42974' ? (
              <p className="text-xs text-yellow-700 mt-4">
                ✅ Vous utilisez le Ask RÉEL codé en dur pour le PDL 14862373311505 (skip étapes 1 et 2)
              </p>
            ) : (
              <p className="text-xs text-yellow-700 mt-4">
                ✅ Vous utilisez un Ask réel récupéré depuis localStorage
              </p>
            )}
          </div>

          <DataRetrieval
            ask={lastAcceptedAsk}
            onBack={() => setUseSwitchgrid(false)}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Barre de progression - masquée en mode Switchgrid */}
      {!useSwitchgrid && (
        <LoadingProgressBar
          progress={progress}
          stage={stage}
          isLoading={isLoading}
          error={error}
          success={success}
        />
      )}

      {!useSwitchgrid && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Configuration du Point de Livraison
        </h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="pdl-input" className="block text-sm font-medium text-gray-700 mb-1">
              Point de Livraison (PDL)
            </label>
            <div className="flex gap-2">
              <input
                id="pdl-input"
                type="text"
                value={pdl}
                onChange={handlePdlChange}
                placeholder="14 chiffres"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg tracking-wider"
                maxLength={14}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Le PDL (Point de Livraison) est un identifiant unique de 14 chiffres que vous trouverez sur votre facture d'électricité
            </p>
          </div>

          <button
            onClick={() => handleFetchAllData(pdl)}
            disabled={isLoading || pdl.length !== 14}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Chargement en cours... {stage}</span>
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                <span>Charger toutes les données</span>
              </>
            )}
          </button>
          
          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">{stage}</span>
                <span className="text-sm text-blue-700">{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {!useSwitchgrid && (
        <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveView('info')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeView === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Données client</span>
              </div>
            </button>
            <button
              onClick={() => setActiveView('consumption')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeView === 'consumption'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Consommation annuelle</span>
              </div>
            </button>
            <button
              onClick={handleLoadCurveTabClick}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeView === 'loadCurve'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                <span>Courbe de charge annuelle</span>
              </div>
            </button>
          </nav>
        </div>

        {isLoading ? (
          <LoadingProgressBar
            progress={progress}
            stage={stage}
            isLoading={isLoading}
            error={error}
            success={success}
          />
        ) : (
          <div className="space-y-6">
            {activeView === 'info' && (
              <>
                <div className="space-y-6">
                  {/* Affichage des détails du contrat C68 */}
                  {contractLoading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        <p className="text-blue-700">Chargement des détails du contrat...</p>
                      </div>
                    </div>
                  )}

                  {contractError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700">Erreur lors du chargement du contrat</p>
                          <p className="text-sm text-red-600 mt-1">{contractError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {contractDetails && !contractLoading && (
                    <ContractDetailsDisplay
                      contractData={contractDetails.contract_data}
                      tariffType={contractDetails.tariff_type}
                      formulaCode={contractDetails.formula_code}
                      updatedAt={contractDetails.updated_at}
                    />
                  )}

                  {/* Affichage des données client Enedis */}
                  {additionalInfo ? (
                    <EnedisInfoDisplay data={additionalInfo} />
                  ) : !contractDetails && !contractLoading && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-700">Aucune donnée client disponible</p>
                          <p className="text-sm text-blue-600 mt-1">
                            Cliquez sur "Charger toutes les données" pour récupérer les informations client.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeView === 'consumption' && (
              <>
                {displayConsumptionData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Graphique de consommation sur 365 jours */}
                    <div data-chart="consumption-365">
                      <ConsumptionAnalysisChart
                        data={displayConsumptionData}
                        title="Consommation sur les 365 derniers jours"
                      />
                    </div>
                    
                    {/* Détection du contrat avec quadrants */}
                    {displayLoadCurveData.length > 0 && (
                      <div data-chart="contract-detection">
                        <ContractDetectionChart
                          data={displayLoadCurveData}
                          title="Détection du contrat - Analyse des quadrants"
                        />
                      </div>
                    )}
                    
                    {/* Graphique des puissances max */}
                    {displayMaxPowerData.length > 0 && (
                      <div data-chart="max-power-365">
                        <MaxPowerAnalysisChart
                          data={displayMaxPowerData}
                          title="Puissances maximales sur les 365 derniers jours"
                        />
                      </div>
                    )}
                    
                    {/* Graphique original pour comparaison */}
                    <div data-chart="consumption-original">
                      <AnnualConsumptionChart
                        data={displayConsumptionData}
                        loadCurveData={displayLoadCurveData}
                        loading={isSectionLoading('consumption')}
                        error={null}
                        hpHcTotals={hpHcTotals}
                        hpHcMonthly={hpHcMonthly}
                        hpHcWeekly={hpHcWeekly}
                        title="Analyse détaillée HP/HC (graphique original)"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-700">Aucune donnée de consommation disponible</p>
                        <p className="text-sm text-blue-600 mt-1">
                          Cliquez sur "Charger toutes les données" pour récupérer les données de consommation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeView === 'loadCurve' && (
              <>
                {/* Debug info - Visible uniquement après 5 clics */}
                {showDebug && (
                  <>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">Debug - Informations sur les données</h4>
                      <div className="text-sm text-yellow-800 space-y-1">
                        <p><strong>Nombre de points :</strong> {displayLoadCurveData.length}</p>
                        <p><strong>Objectif théorique :</strong> 17,520 points (365 jours × 48 points/jour)</p>
                        <p><strong>Pourcentage d'atteinte :</strong> {((displayLoadCurveData.length / 17520) * 100).toFixed(1)}%</p>
                        {displayLoadCurveData.length > 0 && (
                          <>
                            <p><strong>Premier point :</strong> {displayLoadCurveData[0]?.date_time}</p>
                            <p><strong>Dernier point :</strong> {displayLoadCurveData[displayLoadCurveData.length - 1]?.date_time}</p>
                            <p><strong>Période couverte :</strong> {Math.ceil((new Date(displayLoadCurveData[displayLoadCurveData.length - 1]?.date_time).getTime() - new Date(displayLoadCurveData[0]?.date_time).getTime()) / (1000 * 60 * 60 * 24))} jours</p>
                            <p><strong>Couverture temporelle :</strong> {((Math.ceil((new Date(displayLoadCurveData[displayLoadCurveData.length - 1]?.date_time).getTime() - new Date(displayLoadCurveData[0]?.date_time).getTime()) / (1000 * 60 * 60 * 24)) / 365) * 100).toFixed(1)}% de l'année</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Debug data - Échantillon des données */}
                    {displayLoadCurveData.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">Debug - Échantillon des données (50 premiers points)</h4>
                        <pre className="text-xs bg-green-100 p-3 rounded overflow-auto max-h-40">
                          {JSON.stringify(displayLoadCurveData.slice(0, 50), null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}

                {displayLoadCurveData.length > 0 ? (
                  <>
                    <div data-chart="daily-average-power">
                      <DailyAveragePowerCurve
                        data={displayLoadCurveData}
                        title="Courbe de puissances journalière moyenne"
                      />
                    </div>
                    <div data-chart="load-curve">
                      <AnnualLoadCurveTimeline
                        data={displayLoadCurveData}
                        title="Courbe de charge chronologique (365 jours)"
                      />
                    </div>

                    {/* Section de téléchargement CSV */}
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Télécharger la courbe de charge
                      </h4>
                      <div className="flex items-end gap-4">
                        <div className="flex-1">
                          <label htmlFor="period-select" className="block text-sm font-medium text-gray-700 mb-2">
                            Pas de temps (pour information)
                          </label>
                          <select
                            id="period-select"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="PT10M">10 minutes</option>
                            <option value="PT30M">30 minutes</option>
                            <option value="PT1H">1 heure</option>
                            <option value="P1D">1 jour</option>
                          </select>
                        </div>
                        <button
                          onClick={handleDownloadLoadCurve}
                          disabled={isDownloading}
                          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Téléchargement...</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-5 w-5" />
                              <span>Télécharger CSV</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        Le fichier CSV contiendra {displayLoadCurveData.length.toLocaleString()} points de données de courbe de charge.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-700">Aucune donnée de courbe de charge disponible</p>
                        <p className="text-sm text-blue-600 mt-1">
                          Cliquez sur "Charger toutes les données" pour récupérer la courbe de charge annuelle.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default AbieLink;