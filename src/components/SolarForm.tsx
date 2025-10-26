import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from '../contexts/client';
import { calculerProduction } from '../utils/calculations/productionCalculator';
import { calculateRecommendation } from '../utils/calculations/recommendationCalculator';
import AddressForm from './AddressForm';
import SizingSection from './SizingSection';
import RecommendationDisplay from './RecommendationDisplay';
import InstallationSection from './InstallationSection';
import NavigationButtons from './NavigationButtons';
import SunshineDisplay from './SunshineDisplay';
import GoogleMapsView from './GoogleMapsView';
import AddressAutocomplete from './AddressAutocomplete';
import { useSolarData } from '../hooks/useSolarData';
import ProductibleSection from './ProductibleSection';
import { RotateCcw } from 'lucide-react';
import { useSwitchgrid } from '../hooks/useSwitchgrid';
import { ElectricityContract, Ask } from '../types/switchgrid';
import ConsentForm from './switchgrid/ConsentForm';
import { savedMetersApi, SavedMeter } from '../utils/api/savedMetersApi';
import { ChevronDown } from 'lucide-react';
import DailyConsumptionSection from './switchgrid/DailyConsumptionSection';
import { DataTabs } from './switchgrid/DataTabs';

export default function SolarForm() {
  const navigate = useNavigate();
  const { clientInfo, updateClientInfo, address, updateAddress, resetClientInfo } = useClient();
  const { params, setParams, result, setResult, resetData } = useSolarData();
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consumptionMode, setConsumptionMode] = useState<'manual' | 'linky'>('manual');
  const [pdl, setPdl] = useState('');
  const [searchingContract, setSearchingContract] = useState(false);
  const [contractFound, setContractFound] = useState<ElectricityContract | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [acceptedAsk, setAcceptedAsk] = useState<Ask | null>(null);
  
  const { searchContract, loading: switchgridLoading, error: switchgridError } = useSwitchgrid();
  const [contracts, setContracts] = useState<ElectricityContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<ElectricityContract | null>(null);
  const [savedMeters, setSavedMeters] = useState<SavedMeter[]>([]);
  const [showMeterDropdown, setShowMeterDropdown] = useState(false);
  const [dataRetrieved, setDataRetrieved] = useState(false);
  
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

  // Écouter les mises à jour PVGIS pour mettre à jour les résultats
  useEffect(() => {
    const handlePvgisUpdate = (event: CustomEvent) => {
      const { productionAnnuelle } = event.detail;
      setResult(prev => prev ? { ...prev, productionAnnuelle } : null);
    };

    window.addEventListener('pvgisResultsUpdated', handlePvgisUpdate as EventListener);
    return () => {
      window.removeEventListener('pvgisResultsUpdated', handlePvgisUpdate as EventListener);
    };
  }, [setResult]);

  const handlePdlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    setPdl(value);
  };

  const handleSelectSavedMeter = async (meter: SavedMeter) => {
    setPdl(meter.prm);
    setShowMeterDropdown(false);

    // Mettre à jour la date de dernière utilisation
    try {
      await savedMetersApi.updateLastUsed(meter.prm);
      // Recharger la liste
      const meters = await savedMetersApi.getAll();
      setSavedMeters(meters);
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  };

  const handleSearchContract = async () => {
    setHasSearched(true);

    // Validation selon le type de client
    if (clientInfo.typeClient === 'particulier') {
      if (!clientInfo.nom || clientInfo.nom.length < 3) {
        alert('Veuillez renseigner au moins 3 lettres du nom avant de rechercher le contrat');
        return;
      }
    } else {
      // Pour les professionnels, vérifier la dénomination sociale
      if (!clientInfo.denominationSociale || clientInfo.denominationSociale.length < 3) {
        alert('Veuillez renseigner au moins 3 lettres de la dénomination de la société avant de rechercher le contrat');
        return;
      }
    }

    setSearchingContract(true);
    try {
      // Construire les paramètres de recherche
      const searchParams: any = {};

      if (clientInfo.typeClient === 'particulier') {
        searchParams.name = clientInfo.prenom ? `${clientInfo.prenom} ${clientInfo.nom}` : clientInfo.nom;
      } else {
        // Pour les professionnels, utiliser la dénomination sociale
        searchParams.name = clientInfo.denominationSociale;
      }
      
      // Ajouter l'adresse si disponible
      if (address.rue && address.codePostal && address.ville) {
        searchParams.address = `${address.rue} ${address.codePostal} ${address.ville}`;
      }
      
      // Ajouter le PDL si renseigné
      if (pdl.length === 14) {
        searchParams.prm = pdl;
      }
      
      const foundContracts = await searchContract(searchParams);
      
      if (foundContracts.length > 0) {
        setContracts(foundContracts);
        setContractFound(foundContracts[0]);
      } else {
        setContracts([]);
        setContractFound(null);
      }
    } catch (err) {
      console.error('Erreur lors de la recherche de contrat:', err);
      setContracts([]);
      setContractFound(null);
    } finally {
      setSearchingContract(false);
    }
  };

  const handleContractSelect = (contract: ElectricityContract) => {
    setSelectedContract(contract);
    setContractFound(contract);
    console.log('✅ Contrat sélectionné:', contract.prm);
  };

  const handleConsentAccepted = (ask: Ask) => {
    console.log('✅ Consentement accepté:', ask.id);
    setConsentAccepted(true);
    setAcceptedAsk(ask);
    setShowConsentModal(false);
    
    // Sauvegarder l'état du consentement
    localStorage.setItem('switchgrid_consent_accepted', 'true');
    localStorage.setItem('switchgrid_ask_id', ask.id);
    if (selectedContract) {
      localStorage.setItem('switchgrid_contract_prm', selectedContract.prm);
    }
    
    // Forcer le re-render pour mettre à jour l'interface
    setConsumptionMode('linky');
  };

  // Charger l'état du consentement au démarrage
  useEffect(() => {
    const consentAcceptedStored = localStorage.getItem('switchgrid_consent_accepted');
    const askId = localStorage.getItem('switchgrid_ask_id');
    const contractPrm = localStorage.getItem('switchgrid_contract_prm');
    
    if (consentAcceptedStored === 'true') {
      setConsentAccepted(true);
      
      // Restaurer le contrat sélectionné si disponible
      if (contractPrm && contracts.length > 0) {
        const savedContract = contracts.find(c => c.prm === contractPrm);
        if (savedContract) {
          setSelectedContract(savedContract);
        }
      }
    }
  }, []);
  
  // Charger l'état du consentement quand les contrats sont chargés
  useEffect(() => {
    const consentAcceptedStored = localStorage.getItem('switchgrid_consent_accepted');
    const contractPrm = localStorage.getItem('switchgrid_contract_prm');
    
    if (consentAcceptedStored === 'true' && contractPrm && contracts.length > 0) {
      const savedContract = contracts.find(c => c.prm === contractPrm);
      if (savedContract) {
        setSelectedContract(savedContract);
        setConsentAccepted(true);
      }
    }
  }, [contracts]);

  useEffect(() => {
    const calculate = async () => {
      if (!params.adresse.codePostal || !params.consommationAnnuelle) {
        setResult(null);
        return;
      }
      
      setCalculating(true);
      setError(null);
      
      try {
        const results = await calculerProduction(params);
        const recommendation = calculateRecommendation({
          consommationAnnuelle: params.consommationAnnuelle,
          codePostal: params.adresse.codePostal,
          typeCompteur: params.typeCompteur
        });
        
        setResult({
          ...results,
          recommandation: recommendation
        });

        localStorage.setItem('solarResults', JSON.stringify(results));
      } catch (error) {
        console.error('Erreur de calcul:', error);
        setError(error instanceof Error ? error.message : 'Erreur de calcul');
        setResult(null);
      } finally {
        setCalculating(false);
      }
    };

    const timeoutId = setTimeout(calculate, 500);
    return () => clearTimeout(timeoutId);
  }, [params, setResult]);

  const handleReset = () => {
    // Reset client info and address
    resetClientInfo();
    
    // Reset solar data
    resetData();
    
    // Reset result
    setResult(null);
    
    // Reset calculation state
    setCalculating(false);
    setError(null);
    
    // Clear battery selection
    localStorage.removeItem('batterySelection');
    
    // Clear financial data
    localStorage.removeItem('financialMode');
    localStorage.removeItem('primeAutoconsommation');
    localStorage.removeItem('remiseCommerciale');
    localStorage.removeItem('subscriptionDuration');
    localStorage.removeItem('connectionType');
    
    // Clear promo codes
    localStorage.removeItem('applied_promo_codes');
    localStorage.removeItem('promo_discount');
    localStorage.removeItem('promo_free_months');
    localStorage.removeItem('promo_free_deposit');
    localStorage.removeItem('promo_free_battery_setup');
    localStorage.removeItem('promo_free_smart_battery_setup');
    
    // Clear other data
    localStorage.removeItem('revenuFiscal');
  };

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateClientInfo({ [name]: value });
  };

  const handleAddressChange = (updates: any) => {
    setParams(prev => ({
      ...prev,
      adresse: { ...prev.adresse, ...updates }
    }));
    updateAddress(updates);
  };

  const handleCoordinatesChange = (coordinates: { lat: number; lon: number }) => {
    // Update the address in the client context
    updateAddress({ coordinates });

    // Update the params
    setParams(prev => ({
      ...prev,
      adresse: { ...prev.adresse, coordinates }
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: name === 'consommationAnnuelle' ? parseInt(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Simulateur solaire
        </h2>
        <p className="text-gray-600">
          Calculez votre potentiel solaire et vos économies d'énergie
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Coordonnées
            </h3>
            <div className="relative group">
              <button
                type="button"
                onClick={handleReset}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <div className="absolute right-0 top-full mt-2 px-2 py-1 bg-gray-900 text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Réinitialiser
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Sélecteur de type de client */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => updateClientInfo({ typeClient: 'particulier' })}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  clientInfo.typeClient === 'particulier' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Particulier
              </button>
              <button
                type="button"
                onClick={() => updateClientInfo({ typeClient: 'professionnel' })}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  clientInfo.typeClient === 'professionnel' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Professionnel
              </button>
            </div>

            {/* Champs selon le type de client */}
            {clientInfo.typeClient === 'particulier' ? (
              <>
                {/* Particulier : Nom et Prénom */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      name="nom"
                      value={clientInfo.nom}
                      onChange={handlePersonalInfoChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      name="prenom"
                      value={clientInfo.prenom}
                      onChange={handlePersonalInfoChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Professionnel : Dénomination et Représentant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dénomination de la société
                  </label>
                  <input
                    type="text"
                    name="denominationSociale"
                    value={clientInfo.denominationSociale || ''}
                    onChange={handlePersonalInfoChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du représentant
                    </label>
                    <input
                      type="text"
                      name="nomRepresentant"
                      value={clientInfo.nomRepresentant || ''}
                      onChange={handlePersonalInfoChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom du représentant
                    </label>
                    <input
                      type="text"
                      name="prenomRepresentant"
                      value={clientInfo.prenomRepresentant || ''}
                      onChange={handlePersonalInfoChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Toggle TVA pour professionnels */}
                <div className="mt-4 flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-900">
                      Assujetti à la TVA
                    </label>
                    <span className="text-xs text-gray-500">(Cochez si vous êtes assujetti)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clientInfo.assujettieATVA === true}
                      onChange={(e) => updateClientInfo({ assujettieATVA: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
          
          <AddressForm
            address={address}
            onChange={(field, value) => {
              if (field === 'coordinates') {
                updateAddress({ coordinates: value });
                setParams(prev => ({
                  ...prev,
                  adresse: { ...prev.adresse, coordinates: value }
                }));
              } else {
                updateAddress({ [field]: value });
                setParams(prev => ({
                  ...prev,
                  adresse: { ...prev.adresse, [field]: value }
                }));
              }
            }}
          />

        {params.adresse.coordinates && (
          <GoogleMapsView 
            coordinates={address.coordinates}
            onCoordinatesChange={handleCoordinatesChange}
          />
        )}

        {address.codePostal && (
          <SunshineDisplay codePostal={address.codePostal} />
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Consommation annuelle
          </h3>
          
          {/* Sélecteur de mode de saisie */}
          <div className="mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setConsumptionMode('manual')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  consumptionMode === 'manual' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Saisie manuelle
              </button>
              <button
                type="button"
                onClick={() => setConsumptionMode('linky')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  consumptionMode === 'linky' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Connecter mon Linky (recommandé)
              </button>
            </div>
          </div>

          {consumptionMode === 'manual' ? (
            <SizingSection
              typeCompteur={params.typeCompteur}
              consommationAnnuelle={params.consommationAnnuelle}
              onTypeCompteurChange={handleSelectChange}
              onConsommationChange={handleChange}
            />
          ) : (
            <div className="space-y-6">
              {/* Masquer les sections précédentes une fois les données récupérées */}
              {!dataRetrieved && (
                <>
                  {/* Informations client (lecture seule) */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Informations du titulaire du contrat</h4>
                <div className="space-y-2 text-sm">
                  {clientInfo.typeClient === 'particulier' ? (
                    <>
                      <p><strong>Nom :</strong> {clientInfo.prenom} {clientInfo.nom}</p>
                      <p><strong>Adresse :</strong> {address.rue ? `${address.rue}, ${address.codePostal} ${address.ville}` : 'Non renseignée'}</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Société :</strong> {clientInfo.denominationSociale}</p>
                      <p><strong>Représentant :</strong> {clientInfo.prenomRepresentant} {clientInfo.nomRepresentant}</p>
                      <p><strong>Adresse :</strong> {address.rue ? `${address.rue}, ${address.codePostal} ${address.ville}` : 'Non renseignée'}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Champ PDL avec dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PDL (si nous ne le retrouvons pas automatiquement avec le Nom et Adresse)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={pdl}
                    onChange={handlePdlChange}
                    placeholder="14 chiffres"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg tracking-wider"
                    maxLength={14}
                  />
                  {savedMeters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowMeterDropdown(!showMeterDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Compteurs enregistrés"
                    >
                      <ChevronDown className={`h-5 w-5 transition-transform ${showMeterDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Dropdown des compteurs enregistrés */}
                {showMeterDropdown && savedMeters.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b bg-gray-50">
                      <p className="text-xs font-semibold text-gray-700">Compteurs enregistrés</p>
                    </div>
                    {savedMeters.map((meter) => (
                      <button
                        key={meter.id}
                        type="button"
                        onClick={() => handleSelectSavedMeter(meter)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-gray-900">{meter.prm}</span>
                            {meter.label && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{meter.label}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {meter.last_used_at
                              ? `Utilisé le ${new Date(meter.last_used_at).toLocaleDateString('fr-FR')}`
                              : `Créé le ${new Date(meter.created_at).toLocaleDateString('fr-FR')}`
                            }
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                <p className="mt-1 text-xs text-gray-500">
                  Le PDL (Point de Livraison) est un identifiant unique de 14 chiffres que vous trouverez sur votre facture d'électricité
                </p>
              </div>

              {/* Bouton de recherche */}
              <button
                type="button"
                onClick={handleSearchContract}
                disabled={searchingContract || switchgridLoading}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {searchingContract || switchgridLoading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                    <span>Recherche en cours...</span>
                  </>
                ) : (
                  <span>Rechercher le contrat</span>
                )}
              </button>

              {/* Affichage des erreurs Switchgrid */}
              {switchgridError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{switchgridError}</p>
                </div>
              )}

              {/* Affichage des contrats trouvés */}
              {contracts.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Contrats trouvés ({contracts.length})
                  </h4>
                  <div className="space-y-3">
                    {contracts.map((contract) => (
                      <div
                        key={contract.id}
                        onClick={() => handleContractSelect(contract)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedContract?.id === contract.id
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium text-gray-900">
                                {contract.nomClientFinalOuDenominationSociale}
                              </h5>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                contract.categorieClientFinalCode === 'RES' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {contract.categorieClientFinalCode === 'RES' ? 'Particulier' : 'Professionnel'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-gray-600">
                                {contract.adresseInstallationNormalisee.ligne4 && (
                                  <span>{contract.adresseInstallationNormalisee.ligne4}, </span>
                                )}
                                {contract.adresseInstallationNormalisee.ligne6}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-500">
                                PRM: {contract.prm}
                              </span>
                            </div>
                          </div>
                          
                          {selectedContract?.id === contract.id && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-green-600 font-medium">Sélectionné</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message si aucun contrat trouvé - seulement après avoir cliqué sur rechercher */}
              {!switchgridLoading && !switchgridError && contracts.length === 0 && hasSearched && !searchingContract && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm">
                    Aucun contrat trouvé avec ces informations. Vérifiez l'orthographe du nom ou essayez avec le PDL uniquement.
                  </p>
                </div>
              )}
              
              {/* Bouton pour lancer le consentement si un contrat est sélectionné */}
              {selectedContract && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Contrat sélectionné</h4>
                  <p className="text-sm text-green-800 mb-4">
                    Parfait ! Nous avons trouvé votre contrat. Vous pouvez maintenant lancer la demande de consentement 
                    pour accéder à vos données de consommation.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConsentModal(true);
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Lancer la demande de consentement</span>
                  </button>
                </div>
              )}
                </>
              )}

              {/* Affichage après consentement accepté - Onglets Consommation + Type de compteur */}
              {consentAccepted && acceptedAsk && selectedContract && (
                <div className="mt-6">
                  <DataTabs
                    consentId={Object.values(acceptedAsk.consentIds)[0]}
                    prm={selectedContract.prm}
                    contractId={selectedContract.id}
                    onDataRetrieved={(data) => {
                      console.log('📊 Données R65 reçues:', data);

                      // Mettre à jour automatiquement le champ consommation annuelle
                      setParams(prev => ({
                        ...prev,
                        consommationAnnuelle: data.annualConsumption
                      }));

                      // Marquer que les données ont été récupérées pour masquer les sections précédentes
                      setDataRetrieved(true);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section Dimensionnement (ancien Installation) */}

        {result?.recommandation && (
          <RecommendationDisplay
            recommendation={result.recommandation}
            consommationAnnuelle={params.consommationAnnuelle}
            departement={params.adresse.codePostal.substring(0, 2)}
          />
        )}

        {/* Section Installation (paramètres techniques) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Installation
          </h3>
          <InstallationSection
            params={params}
            onChange={handleChange}
            onSelectChange={(e) => handleSelectChange(e.target.name, e.target.value)}
            onParamsChange={(updates) => setParams(prev => ({ ...prev, ...updates }))}
          />
        </div>

        {/* Section Productible avec graphique PVGIS */}
        {address.coordinates && (
          <ProductibleSection
            coordinates={address.coordinates}
            puissanceCrete={(params.nombreModules * params.puissanceModules) / 1000}
            orientation={params.orientation}
            inclinaison={params.inclinaison}
            pertes={params.pertes}
          />
        )}

        {calculating && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Calcul en cours...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-4 rounded-md text-red-800">
            {error}
          </div>
        )}

        {(
          <NavigationButtons
            onReset={handleReset}
            canProceed={!!result && !calculating && !error}
            result={result}
          />
        )}
      </form>

      {/* Modal de consentement */}
      {showConsentModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Demande de consentement
                </h2>
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <ConsentForm
                contract={selectedContract}
                onConsentAccepted={handleConsentAccepted}
                onBack={() => setShowConsentModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}