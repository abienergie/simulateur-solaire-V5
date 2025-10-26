import React, { useState } from 'react';
import { Link as LinkIcon, Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ElectricityContract, Ask } from '../types/switchgrid';
import ContractSearch from '../components/switchgrid/ContractSearch';
import ConsentForm from '../components/switchgrid/ConsentForm';
import DataRetrieval from '../components/switchgrid/DataRetrieval';
import { savedMetersApi } from '../utils/api/savedMetersApi';

type Step = 'search' | 'consent' | 'data';

export default function SwitchgridLink() {
  const [currentStep, setCurrentStep] = useState<Step>('search');
  const [selectedContract, setSelectedContract] = useState<ElectricityContract | null>(null);
  const [acceptedAsk, setAcceptedAsk] = useState<Ask | null>(null);

  const handleContractSelected = (contract: ElectricityContract) => {
    setSelectedContract(contract);
    setCurrentStep('consent');
  };

  const handleConsentAccepted = async (ask: Ask) => {
    setAcceptedAsk(ask);
    setCurrentStep('data');

    // Sauvegarder automatiquement le compteur avec les informations de consentement
    if (ask.contracts && ask.contracts.length > 0 && ask.consentIds) {
      const contract = ask.contracts[0];
      const consentId = ask.consentIds[contract.id];

      if (contract.prm && consentId) {
        try {
          await savedMetersApi.save({
            prm: contract.prm,
            ask_id: ask.id,
            contract_id: contract.id,
            consent_id: consentId,
            label: contract.nomClientFinalOuDenominationSociale || undefined
          });
          console.log('✅ Compteur sauvegardé automatiquement:', contract.prm);
        } catch (error) {
          console.error('Erreur lors de la sauvegarde du compteur:', error);
        }
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'consent') {
      setCurrentStep('search');
      setSelectedContract(null);
    } else if (currentStep === 'data') {
      setCurrentStep('consent');
      setAcceptedAsk(null);
    }
  };

  const resetAll = () => {
    setCurrentStep('search');
    setSelectedContract(null);
    setAcceptedAsk(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour au simulateur
        </Link>
      </div>

      {/* En-tête avec nouveau design Switchgrid */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between text-white mb-4">
          <div className="flex items-center gap-3">
            <LinkIcon className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Abie Link</h1>
            <span className="bg-white/20 px-2 py-1 rounded-full text-sm">
              Powered by Switchgrid
            </span>
          </div>
          <div className="flex items-center">
            <Zap className="h-6 w-6 text-yellow-300" />
          </div>
        </div>
        <p className="text-green-100">
          Accédez légalement et simplement à vos données de consommation Enedis 
          pour optimiser votre installation solaire
        </p>
      </div>

      {/* Indicateur de progression */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${
            currentStep === 'search' ? 'text-blue-600' : 'text-green-600'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'search' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              1
            </div>
            <span className="font-medium">Recherche contrat</span>
          </div>

          <div className={`flex items-center gap-2 ${
            currentStep === 'consent' ? 'text-blue-600' :
            currentStep === 'data' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'consent' ? 'bg-blue-100' :
              currentStep === 'data' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              2
            </div>
            <span className="font-medium">Consentement</span>
          </div>

          <div className={`flex items-center gap-2 ${
            currentStep === 'data' ? 'text-blue-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'data' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              3
            </div>
            <span className="font-medium">Données</span>
          </div>
        </div>
      </div>

      {/* Bouton Skip vers étape 3 pour tests */}
      {currentStep !== 'data' && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow-sm p-4 mb-8 border-2 border-yellow-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Mode Test - PDL 14862373311505</h3>
                <p className="text-sm text-gray-600">
                  Utiliser le consentement codé en dur pour skip les étapes 1 et 2
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // Mock Ask avec les vrais IDs
                const mockAsk: Ask = {
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

                setAcceptedAsk(mockAsk);
                setCurrentStep('data');
              }}
              className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors font-medium flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Skip vers étape 3
            </button>
          </div>
        </div>
      )}

      {/* Contenu selon l'étape */}
      {currentStep === 'search' && (
        <ContractSearch onContractSelected={handleContractSelected} />
      )}

      {currentStep === 'consent' && selectedContract && (
        <ConsentForm 
          contract={selectedContract}
          onConsentAccepted={handleConsentAccepted}
          onBack={handleBack}
        />
      )}

      {currentStep === 'data' && acceptedAsk && (
        <>
          {/* Affichage du contract_id pour les tests */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-yellow-900 mb-4">
              🔑 Informations de consentement (pour tests)
            </h3>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <span className="text-yellow-700 font-semibold">Ask ID:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {acceptedAsk.id}
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-semibold">Contract ID:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {acceptedAsk.contracts[0]?.id || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-semibold">Consent ID:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {Object.values(acceptedAsk.consentIds)[0] || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-yellow-700 font-semibold">PRM:</span>
                <div className="bg-white rounded px-3 py-2 mt-1 text-yellow-900 break-all">
                  {acceptedAsk.contracts[0]?.prm || 'N/A'}
                </div>
              </div>
            </div>
            <p className="text-xs text-yellow-700 mt-4">
              💡 Ces informations ont été sauvegardées dans localStorage et seront réutilisées automatiquement sur la page Abie Link
            </p>
          </div>

          <DataRetrieval
            ask={acceptedAsk}
            onBack={handleBack}
          />
        </>
      )}

      {/* Bouton de reset global */}
      {currentStep !== 'search' && (
        <div className="mt-8 text-center">
          <button
            onClick={resetAll}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Recommencer depuis le début
          </button>
        </div>
      )}
    </div>
  );
}