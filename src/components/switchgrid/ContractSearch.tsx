import React, { useState } from 'react';
import { Search, Upload, User, Home, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ElectricityContract } from '../../types/switchgrid';
import { useSwitchgrid } from '../../hooks/useSwitchgrid';
import { useClient } from '../../contexts/client';
import AddressAutocomplete from '../AddressAutocomplete';

interface ContractSearchProps {
  onContractSelected: (contract: ElectricityContract) => void;
}

export default function ContractSearch({ onContractSelected }: ContractSearchProps) {
  const { clientInfo, address } = useClient();
  const { loading, error, contracts, searchContract, searchContractsFromInvoices, setError } = useSwitchgrid();
  
  const [searchMode, setSearchMode] = useState<'manual' | 'invoice'>('manual');
  const [manualSearch, setManualSearch] = useState({
    name: `${clientInfo.prenom} ${clientInfo.nom}`.trim(),
    address: address.rue ? `${address.rue} ${address.codePostal} ${address.ville}`.trim() : '',
    prm: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleAddressSelect = (
    fullAddress: string, 
    postcode: string, 
    city: string, 
    coordinates: { lat: number; lon: number }
  ) => {
    // Construire l'adresse complète pour la recherche
    const completeAddress = `${fullAddress} ${postcode} ${city}`;
    setManualSearch(prev => ({ 
      ...prev, 
      address: completeAddress 
    }));
  };

  const handleManualSearch = async () => {
    console.log('🎯 Manual search triggered with data:', manualSearch);
    
    setHasSearched(true);
    
    // Validation côté client - le nom est obligatoire + au moins un autre champ
    const hasName = manualSearch.name.trim().length >= 3;
    const hasAddress = manualSearch.address.trim().length > 0;
    const hasPrm = manualSearch.prm.trim().length === 14;
    
    const hasAdditionalField = hasAddress || hasPrm;
    
    if (!hasName) {
      setError('Le nom du titulaire est obligatoire (minimum 3 caractères)');
      return;
    }
    
    if (!hasAdditionalField) {
      setError('Veuillez renseigner le nom ET au moins un autre champ : adresse ou PDL (14 chiffres)');
      return;
    }

    // Normaliser le nom
    const normalizedName = manualSearch.name.trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    console.log('🔄 Calling searchContract with params:', {
      name: normalizedName,
      address: manualSearch.address.trim() || undefined,
      prm: hasPrm ? manualSearch.prm.trim() : undefined
    });

    try {
      const result = await searchContract({
        name: normalizedName,
        address: manualSearch.address.trim() || undefined,
        prm: hasPrm ? manualSearch.prm.trim() : undefined
      });
      
      console.log('✅ Search completed successfully, result:', result);
    } catch (err) {
      console.error('❌ Search failed in component:', err);
      // L'erreur est déjà gérée par le hook, mais on log ici aussi pour debug
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/pdf' || file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        setError('Seuls les fichiers PDF et images sont acceptés');
        return false;
      }
      
      if (!isValidSize) {
        setError('Taille maximale : 10MB par fichier');
        return false;
      }
      
      return true;
    });

    setSelectedFiles(validFiles);
    setError(null);
  };

  const handleInvoiceSearch = async () => {
    if (selectedFiles.length === 0) {
      setError('Veuillez sélectionner au moins une facture');
      return;
    }

    setHasSearched(true);

    try {
      await searchContractsFromInvoices(selectedFiles);
    } catch (err) {
      // L'erreur est déjà gérée par le hook
    }
  };

  const handleContractSelect = (contract: ElectricityContract) => {
    console.log('✅ Contrat sélectionné:', contract.prm);
    onContractSelected(contract);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Étape 1 : Recherche de votre contrat électrique
        </h3>

        {/* Mode de recherche */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setSearchMode('manual')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              searchMode === 'manual' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Search className="h-4 w-4" />
              <span>Recherche manuelle</span>
            </div>
          </button>
          <button
            onClick={() => setSearchMode('invoice')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              searchMode === 'invoice' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Upload facture</span>
            </div>
          </button>
        </div>

        {searchMode === 'manual' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du titulaire du contrat *
              </label>
              <input
                type="text"
                value={manualSearch.name}
                onChange={(e) => setManualSearch(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Prénom Nom"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Nom tel qu'il apparaît sur votre facture d'électricité
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse complète (optionnel)
              </label>
              <AddressAutocomplete
                value={manualSearch.address}
                onChange={(value) => setManualSearch(prev => ({ ...prev, address: value }))}
                onSelect={handleAddressSelect}
              />
              <p className="text-xs text-gray-500 mt-1">
                Saisissez votre adresse pour affiner la recherche (optionnel mais recommandé)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PDL (si nous ne le retrouvons pas automatiquement avec le Nom et Adresse)
                <div className="relative inline-block ml-2 group">
                  <AlertCircle className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-sm rounded-lg py-2 px-3 w-72 bottom-full left-1/2 -translate-x-1/2 mb-2">
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                    Le PDL (Point De Livraison) est un identifiant unique de 14 chiffres que vous trouverez sur votre facture d'électricité ou sur votre compteur Linky. Il permet d\'identifier précisément votre installation électrique.
                  </div>
                </div>
              </label>
              <input
                type="text"
                value={manualSearch.prm}
                onChange={(e) => setManualSearch(prev => ({ 
                  ...prev, 
                  prm: e.target.value.replace(/\D/g, '').slice(0, 14) 
                }))}
                placeholder="14 chiffres"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                maxLength={14}
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisez ce champ si la recherche automatique ne trouve pas votre contrat
              </p>
            </div>

            <button
              onClick={handleManualSearch}
              disabled={loading || (() => {
                const hasName = manualSearch.name.trim().length >= 3;
                const hasAddress = manualSearch.address.trim().length > 0;
                const hasPrm = manualSearch.prm.trim().length === 14;
                const hasAdditionalField = hasAddress || hasPrm;
                return !hasName || !hasAdditionalField;
              })()}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Recherche en cours...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Rechercher le contrat</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléversez vos factures d'électricité
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formats acceptés : PDF, JPG, PNG (max 10MB par fichier)
              </p>
            </div>
            
            {/* Message informatif pour l'upload de factures */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Fonctionnalité temporairement indisponible</p>
                  <p className="text-sm text-amber-700 mt-1">
                    L'analyse automatique de factures est en cours de maintenance. 
                    Veuillez utiliser la recherche manuelle avec le nom du titulaire et l'adresse.
                  </p>
                  <p className="text-sm text-amber-700 mt-2">
                    <strong>Astuce :</strong> Le nom doit être exactement comme sur votre facture Enedis.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleInvoiceSearch}
              disabled={true}
              className="w-full px-4 py-3 bg-gray-400 text-white rounded-md cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="h-5 w-5" />
              <span>Fonctionnalité indisponible</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Affichage quand aucun contrat n'est trouvé */}
        {!loading && !error && contracts.length === 0 && hasSearched && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Aucun contrat trouvé</p>
                <p className="text-sm text-amber-700 mt-1">
                  {searchMode === 'manual' 
                    ? "Aucun contrat ne correspond aux critères de recherche. Vérifiez l'orthographe du nom ou essayez avec moins d'informations."
                    : "Aucun contrat n'a pu être extrait des factures. Vérifiez que les fichiers sont lisibles et contiennent bien des informations de contrat Enedis."
                  }
                  {' '}
                  <strong>Important :</strong> Si vous n'êtes pas raccordé au réseau Enedis 
                  (par exemple si vous dépendez d'une régie locale d\'électricité), 
                  votre contrat ne pourra pas être trouvé via cette recherche.
                </p>
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-amber-700 font-medium">Suggestions :</p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Vérifiez l'orthographe exacte du nom sur votre facture</li>
                    <li>• Essayez sans l'adresse (nom uniquement)</li>
                    <li>• Utilisez le PRM si vous le connaissez</li>
                    <li>• Vérifiez que vous êtes bien raccordé au réseau Enedis</li>
                    <li>• Contactez le support si le problème persiste</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-blue-500" />
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
                        <Home className="h-4 w-4 text-gray-400" />
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
                    
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}