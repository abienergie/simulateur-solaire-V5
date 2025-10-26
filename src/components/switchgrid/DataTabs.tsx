import React, { useState, useEffect } from 'react';
import { DailyConsumptionSection } from './DailyConsumptionSection';
import { switchgridApi } from '../../utils/api/switchgridApi';
import { BarChart3, Zap, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface DataTabsProps {
  consentId: string;
  prm: string;
  contractId: string;
  onDataRetrieved?: (data: { annualConsumption: number; dailyData: any[] }) => void;
}

type TabType = 'consumption' | 'meterType';

export function DataTabs({ consentId, prm, contractId, onDataRetrieved }: DataTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('consumption');
  const [meterTypeLoading, setMeterTypeLoading] = useState(false);
  const [meterPhaseType, setMeterPhaseType] = useState<string | null>(null);
  const [meterData, setMeterData] = useState<any>(null);
  const [meterError, setMeterError] = useState<string | null>(null);

  // Fetch meter type when tab is active
  useEffect(() => {
    if (activeTab !== 'meterType' || !contractId || meterData) {
      return;
    }

    const fetchMeterType = async () => {
      setMeterTypeLoading(true);
      setMeterError(null);

      try {
        console.log('🔌 Getting contract details for contractId:', contractId);
        const contractDetails = await switchgridApi.getContractDetails(contractId);
        console.log('✅ Contract Details Response:', contractDetails);

        const phaseType = contractDetails.meters?.[0]?.phaseType || null;
        const meterInfo = contractDetails.meters?.[0] || null;

        setMeterPhaseType(phaseType);
        setMeterData(contractDetails);
        console.log('📋 Extracted Phase Type:', phaseType);
      } catch (err: any) {
        console.error('❌ Error fetching meter type:', err);
        setMeterError(err.message || 'Erreur lors de la récupération du type de compteur');
      } finally {
        setMeterTypeLoading(false);
      }
    };

    fetchMeterType();
  }, [activeTab, contractId, meterData]);

  return (
    <div className="space-y-4">
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('consumption')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'consumption'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <BarChart3 className="h-5 w-5" />
            Consommation
          </button>

          <button
            onClick={() => setActiveTab('meterType')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'meterType'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Zap className="h-5 w-5" />
            Type de compteur
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'consumption' && (
          <DailyConsumptionSection
            consentId={consentId}
            prm={prm}
            onDataRetrieved={onDataRetrieved}
          />
        )}

        {activeTab === 'meterType' && (
          <>
            {meterTypeLoading && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      Récupération des informations du compteur...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {meterError && !meterTypeLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900 mb-2">
                      Erreur de récupération
                    </h3>
                    <p className="text-red-700">{meterError}</p>
                  </div>
                </div>
              </div>
            )}

            {meterData && !meterTypeLoading && (
              <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Informations du compteur
                  </h3>
                </div>

                {/* Phase Type - Principal info */}
                {meterPhaseType && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900">Type de phase</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {meterPhaseType === 'single-phase' ? 'Monophasé' :
                       meterPhaseType === 'three-phase' ? 'Triphasé' :
                       meterPhaseType}
                    </p>
                  </div>
                )}

                {/* Contract Info */}
                {meterData.contract && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Titulaire</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {meterData.contract.holder || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Type de client</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {meterData.contract.resOrPro === 'RES' ? 'Résidentiel' : 'Professionnel'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivery Info */}
                {meterData.delivery && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Point de livraison
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600">Puissance de raccordement</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {meterData.delivery.connectionCapacity_kVA || 'N/A'} kVA
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600">PRM</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1 font-mono">
                          {meterData.delivery.prm || prm}
                        </p>
                      </div>
                    </div>
                    {meterData.delivery.address && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600">Adresse</p>
                        <p className="text-base text-gray-900 mt-1">
                          {meterData.delivery.address}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
