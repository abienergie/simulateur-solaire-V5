import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, FileText, BarChart3, TrendingUp, Clock, Zap, Info } from 'lucide-react';
import { useMeterDataFetcher, DataStatus } from '../../hooks/useMeterDataFetcher';
import AnnualConsumptionChart from '../AnnualConsumptionChart';
import DailyAveragePowerCurve from '../DailyAveragePowerCurve';

interface MeterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  prm: string;
  consentId: string;
  onDataReady?: (data: {
    c68?: any;
    r65?: any;
    loadCurve?: any;
    dailyBehavior?: any;
    production?: any;
  }) => void;
}

type TabType = 'contract' | 'consumption' | 'loadCurve' | 'dailyBehavior' | 'production';

export default function MeterDataModal({ isOpen, onClose, prm, consentId, onDataReady }: MeterDataModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('contract');
  const { state, fetchAllData, retryFetch } = useMeterDataFetcher();

  useEffect(() => {
    if (isOpen && prm && consentId) {
      console.log('🚀 Lancement récupération données - PRM:', prm, 'ConsentId:', consentId);
      fetchAllData(prm, consentId);
    }
  }, [isOpen, prm, consentId, fetchAllData]);

  useEffect(() => {
    const preparedData = {
      c68: state.c68.status === 'success' ? state.c68.data : undefined,
      r65: state.r65.status === 'success' ? state.r65.data : undefined,
      loadCurve: state.loadCurve.status === 'success' ? state.loadCurve.data : undefined,
      dailyBehavior: state.dailyBehavior.status === 'success' ? state.dailyBehavior.data : undefined,
      production: state.production.status === 'success' ? state.production.data : undefined
    };

    if (preparedData.c68 || preparedData.r65) {
      localStorage.setItem('meter_data_autofill', JSON.stringify(preparedData));
    }

    if (onDataReady) {
      onDataReady(preparedData);
    }
  }, [state, onDataReady]);

  if (!isOpen) return null;

  const getStatusBadge = (status: DataStatus) => {
    switch (status) {
      case 'loading':
        return <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />;
      case 'success':
        return <span className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'error':
        return <span className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <span className="w-2 h-2 bg-gray-300 rounded-full" />;
    }
  };

  const hasProduction = state.production.status === 'success' && state.production.data;

  const tabs: Array<{ id: TabType; label: string; icon: any; status: DataStatus; visible: boolean }> = [
    { id: 'contract', label: 'Informations contrat', icon: FileText, status: state.c68.status, visible: true },
    { id: 'consumption', label: 'Consommation annuelle', icon: BarChart3, status: state.r65.status, visible: true },
    { id: 'loadCurve', label: 'Courbe de charge', icon: TrendingUp, status: state.loadCurve.status, visible: true },
    { id: 'dailyBehavior', label: 'Comportement journalier', icon: Clock, status: state.dailyBehavior.status, visible: true },
    { id: 'production', label: 'Production', icon: Zap, status: state.production.status, visible: hasProduction }
  ];

  const renderTabContent = () => {
    const currentState = state[activeTab === 'contract' ? 'c68' : activeTab === 'consumption' ? 'r65' : activeTab];

    if (currentState.status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium text-lg">Récupération des données en cours...</p>
          <p className="text-sm text-gray-500">Cela peut prendre jusqu'à 15 minutes</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-blue-800 text-center">
              Les données sont récupérées en arrière-plan. Vous pouvez fermer cette fenêtre et revenir plus tard.
            </p>
          </div>
        </div>
      );
    }

    if (currentState.status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
          <p className="text-red-700 font-medium text-lg">Erreur lors de la récupération</p>
          <p className="text-sm text-gray-600 max-w-md text-center">{currentState.error}</p>
          <button
            onClick={() => retryFetch(activeTab === 'contract' ? 'c68' : activeTab === 'consumption' ? 'r65' : activeTab, prm, consentId)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Réessayer
          </button>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-yellow-800">
              <strong>Astuce :</strong> Si l'erreur persiste, vérifiez que le PRM et le consentement sont valides.
            </p>
          </div>
        </div>
      );
    }

    if (currentState.status === 'success') {
      return renderSuccessContent();
    }

    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Clock className="h-16 w-16 text-gray-400" />
        <p className="text-gray-600">En attente de démarrage...</p>
      </div>
    );
  };

  const renderSuccessContent = () => {
    switch (activeTab) {
      case 'contract':
        return renderContractData();
      case 'consumption':
        return renderConsumptionData();
      case 'loadCurve':
        return renderLoadCurveData();
      case 'dailyBehavior':
        return renderDailyBehaviorData();
      case 'production':
        return renderProductionData();
      default:
        return null;
    }
  };

  const renderContractData = () => {
    const data = state.c68.data;
    if (!data) return null;

    return (
      <div className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-500 p-2 rounded-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-green-900">Données contractuelles récupérées</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Point de Référence Mesure (PRM)</p>
              <p className="text-2xl font-bold text-gray-900">{data.prm || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Puissance souscrite</p>
              <p className="text-2xl font-bold text-blue-600">{data.puissanceSouscrite || 'N/A'} <span className="text-lg">kVA</span></p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Formule tarifaire</p>
              <p className="text-lg font-semibold text-gray-900">{data.formuleTarifaire || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Type de compteur</p>
              <p className="text-lg font-semibold text-gray-900">{data.typeCompteur || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">État contractuel</p>
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                {data.etatContractuel || 'N/A'}
              </span>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Calendrier distributeur</p>
              <p className="text-lg font-semibold text-gray-900">{data.calendrierDistributeur || 'N/A'}</p>
            </div>
          </div>
        </div>

        {data.tariffInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-blue-600" />
              <h5 className="font-medium text-blue-900">Informations tarifaires</h5>
            </div>
            <pre className="text-xs bg-white p-4 rounded border overflow-auto max-h-40">
              {JSON.stringify(data.tariffInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderConsumptionData = () => {
    const data = state.r65.data;
    if (!data || !data.rows) return null;

    const totalConsumption = data.rows.reduce((sum: number, row: any) => sum + (row.energy_total_kwh || 0), 0);
    const avgDailyConsumption = data.rows.length > 0 ? totalConsumption / data.rows.length : 0;

    const chartData = data.rows.map((row: any) => ({
      date: row.date,
      total: row.energy_total_kwh,
      peak_hours: 0,
      off_peak_hours: 0
    }));

    return (
      <div className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-blue-900">Consommation annuelle</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Points de données</p>
              <p className="text-3xl font-bold text-gray-900">{data.count || data.rows.length}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Consommation totale</p>
              <p className="text-3xl font-bold text-blue-600">{totalConsumption.toFixed(0)} <span className="text-lg">kWh</span></p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Moyenne journalière</p>
              <p className="text-3xl font-bold text-indigo-600">{avgDailyConsumption.toFixed(1)} <span className="text-lg">kWh</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h5 className="font-semibold text-gray-900 mb-4 text-lg">Évolution sur 12 mois</h5>
          <AnnualConsumptionChart
            data={chartData}
            loading={false}
            error={null}
            title=""
            hpHcTotals={undefined}
            hpHcMonthly={[]}
            hpHcWeekly={[]}
          />
        </div>
      </div>
    );
  };

  const renderLoadCurveData = () => {
    const data = state.loadCurve.data;
    if (!data || !data.rows) return null;

    return (
      <div className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-500 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-purple-900">Courbe de charge</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Points de mesure</p>
              <p className="text-3xl font-bold text-gray-900">{data.count || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Période</p>
              <p className="text-lg font-semibold text-gray-900">
                {data.period?.start && data.period?.end
                  ? `${new Date(data.period.start).toLocaleDateString('fr-FR')} → ${new Date(data.period.end).toLocaleDateString('fr-FR')}`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h5 className="font-semibold text-gray-900 mb-4 text-lg">Profil de consommation</h5>
          <DailyAveragePowerCurve
            data={data.rows.map((row: any) => ({
              date: row.datetime,
              value: row.power_kw
            }))}
            title=""
          />
        </div>
      </div>
    );
  };

  const renderDailyBehaviorData = () => {
    const data = state.dailyBehavior.data;
    if (!data || !data.rows) return null;

    return (
      <div className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-amber-900">Comportement journalier</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Points de mesure</p>
              <p className="text-3xl font-bold text-gray-900">{data.count || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Période analysée</p>
              <p className="text-lg font-semibold text-gray-900">
                {data.period?.start && data.period?.end
                  ? `${new Date(data.period.start).toLocaleDateString('fr-FR')} → ${new Date(data.period.end).toLocaleDateString('fr-FR')}`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h5 className="font-semibold text-gray-900 mb-4 text-lg">Profil de consommation moyen</h5>
          <DailyAveragePowerCurve
            data={data.rows.map((row: any) => ({
              date: row.datetime,
              value: row.power_kw
            }))}
            title=""
          />
        </div>
      </div>
    );
  };

  const renderProductionData = () => {
    if (!hasProduction) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="bg-gray-100 p-6 rounded-full">
            <Zap className="h-16 w-16 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium text-lg">Aucune production de surplus détectée</p>
          <p className="text-sm text-gray-500 max-w-md text-center">
            Ce compteur ne semble pas avoir d'installation photovoltaïque ou la production n'est pas injectée sur le réseau.
          </p>
        </div>
      );
    }

    const data = state.production.data;
    return (
      <div className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-500 p-2 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-green-900">Production solaire</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Points de mesure</p>
              <p className="text-3xl font-bold text-gray-900">{data.count || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Période</p>
              <p className="text-lg font-semibold text-gray-900">
                {data.period?.start && data.period?.end
                  ? `${new Date(data.period.start).toLocaleDateString('fr-FR')} → ${new Date(data.period.end).toLocaleDateString('fr-FR')}`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h5 className="font-semibold text-gray-900 mb-4 text-lg">Production injectée</h5>
          <DailyAveragePowerCurve
            data={data.rows.map((row: any) => ({
              date: row.datetime,
              value: row.power_kw
            }))}
            title=""
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Données du compteur</h2>
            <p className="text-sm text-gray-600 mt-1">PRM: <span className="font-mono font-semibold">{prm}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="h-7 w-7 text-gray-600" />
          </button>
        </div>

        <div className="border-b bg-gray-50">
          <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
            {tabs.filter(tab => tab.visible).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 border-b-4 transition-all whitespace-nowrap font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white shadow-sm'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
                {getStatusBadge(tab.status)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
