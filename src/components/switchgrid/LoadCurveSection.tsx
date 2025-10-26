import React, { useState } from 'react';
import { Loader2, CheckCircle, Clock, Download, RefreshCw, AlertCircle } from 'lucide-react';
import {
  createOrder,
  getOrder,
  getRequestData,
  pollOrderUntilSuccess,
  type OrderResponse
} from '../../utils/api/switchgridLoadCurveApi';
import LoadCurveAnnualChart from '../charts/LoadCurveAnnualChart';
import WeeklyAveragePowerChart from '../charts/WeeklyAveragePowerChart';
import AutoconsumptionAnalysis from './AutoconsumptionAnalysis';

interface LoadCurveSectionProps {
  consentId: string;
  usagePointId?: string;
  onDataRetrieved?: (data: any) => void;
}

const LoadCurveSection: React.FC<LoadCurveSectionProps> = ({
  consentId,
  usagePointId,
  onDataRetrieved
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Étape 1: Order creation
  const [order, setOrder] = useState<OrderResponse | null>(null);

  // Étape 2: Order status
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Étape 3: Data download
  const [loadCurveData, setLoadCurveData] = useState<any | null>(null);
  const [period, setPeriod] = useState<'30min' | '1h'>('30min');
  const [format, setFormat] = useState<'json' | 'csv'>('json');

  // Étape 1: Créer la commande
  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Creating LOADCURVE order...');

      const requests = [{
        type: 'LOADCURVE' as const,
        direction: 'CONSUMPTION' as const,
        ...(usagePointId && { usagePointId })
      }];

      const orderResponse = await createOrder(consentId, requests);

      setOrder(orderResponse);
      setOrderStatus(orderResponse.status);
      setStep(2);

      console.log('✅ Order created successfully:', orderResponse);

      // Auto-start polling si souhaité
      if (orderResponse.status === 'PENDING' || orderResponse.status === 'IN_PROGRESS') {
        handleStartPolling();
      }
    } catch (err) {
      console.error('❌ Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2: Vérifier le statut (manuel)
  const handleCheckStatus = async () => {
    if (!order?.id) return;

    setLoading(true);
    setError(null);

    try {
      const orderResponse = await getOrder(order.id);
      setOrderStatus(orderResponse.status);
      setOrder(orderResponse);

      if (orderResponse.status === 'SUCCESS') {
        setStep(3);
      }
    } catch (err) {
      console.error('❌ Error checking status:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification du statut');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2: Polling automatique
  const handleStartPolling = async () => {
    if (!order?.id) return;

    setIsPolling(true);
    setError(null);

    try {
      console.log('⏳ Starting automatic polling...');
      const finalOrder = await pollOrderUntilSuccess(order.id, 200, 5000);

      setOrder(finalOrder);
      setOrderStatus(finalOrder.status);
      setStep(3);

      console.log('✅ Order completed!');
    } catch (err) {
      console.error('❌ Polling error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du polling');
    } finally {
      setIsPolling(false);
    }
  };

  // Étape 3: Télécharger les données
  const handleDownloadData = async () => {
    if (!order?.requests?.[0]?.id) {
      setError('Request ID non disponible');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestId = order.requests[0].id;
      console.log('📥 Downloading data for request:', requestId);

      const data = await getRequestData(requestId, format, period);

      setLoadCurveData(data);

      if (onDataRetrieved) {
        onDataRetrieved(data);
      }

      console.log('✅ Data downloaded successfully');

      // Si format CSV, déclencher le téléchargement
      if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `courbe-de-charge-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('❌ Error downloading data:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600';
      case 'ERROR':
        return 'text-red-600';
      case 'IN_PROGRESS':
        return 'text-blue-600';
      case 'PENDING':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'ERROR':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'IN_PROGRESS':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Récupération de la courbe de charge
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Erreur</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Indicateurs d'étapes */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((stepNum) => (
          <React.Fragment key={stepNum}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= stepNum
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNum}
              </div>
              <span className={`text-sm mt-2 ${step >= stepNum ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {stepNum === 1 && 'Créer'}
                {stepNum === 2 && 'Vérifier'}
                {stepNum === 3 && 'Télécharger'}
              </span>
            </div>
            {stepNum < 3 && (
              <div
                className={`flex-1 h-1 mx-4 ${
                  step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Étape 1: Créer la commande */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Étape 1 :</strong> Créer une commande pour récupérer la courbe de charge.
              Cette opération lance une demande asynchrone auprès d'Enedis.
            </p>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Consent ID :</strong> {consentId}</p>
            {usagePointId && <p><strong>Usage Point ID :</strong> {usagePointId}</p>}
          </div>

          <button
            onClick={handleCreateOrder}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Création en cours...</span>
              </>
            ) : (
              <>
                <span>Créer la commande</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Étape 2: Vérifier le statut */}
      {step === 2 && order && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700">
              <strong>Étape 2 :</strong> La commande est en cours de traitement.
              Vous pouvez vérifier manuellement le statut ou lancer un polling automatique.
            </p>
          </div>

          {/* Informations sur la commande */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Order ID:</span>
              <span className="text-sm text-gray-600 font-mono">{order.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Statut:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(orderStatus)}
                <span className={`text-sm font-medium ${getStatusColor(orderStatus)}`}>
                  {orderStatus}
                </span>
              </div>
            </div>
            {order.requests?.[0]?.id && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Request ID:</span>
                <span className="text-sm text-gray-600 font-mono">{order.requests[0].id}</span>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={loading || isPolling}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  <span>Vérifier maintenant</span>
                </>
              )}
            </button>

            {!isPolling && orderStatus !== 'SUCCESS' && (
              <button
                onClick={handleStartPolling}
                disabled={loading || isPolling}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Clock className="h-5 w-5" />
                <span>Polling auto (5s)</span>
              </button>
            )}

            {isPolling && (
              <div className="flex-1 px-6 py-3 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Polling en cours...</span>
              </div>
            )}
          </div>

          {orderStatus === 'SUCCESS' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700">Données prêtes !</p>
                  <p className="text-sm text-green-600 mt-1">
                    Vous pouvez maintenant télécharger les données de la courbe de charge.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Étape 3: Télécharger les données */}
      {step === 3 && order && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              <strong>Étape 3 :</strong> Les données sont prêtes à être téléchargées.
              Choisissez le format et le pas de temps souhaités.
            </p>
          </div>

          {/* Options de téléchargement */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pas de temps
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as '30min' | '1h')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30min">30 minutes</option>
                <option value="1h">1 heure</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleDownloadData}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Téléchargement...</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                <span>Télécharger les données</span>
              </>
            )}
          </button>

          {/* Affichage des graphiques */}
          {loadCurveData && format === 'json' && Array.isArray(loadCurveData) && loadCurveData.length > 0 ? (
            <div className="space-y-6 mt-6">
              {/* Graphique 1: Courbe annuelle sur 365 jours */}
              <LoadCurveAnnualChart data={loadCurveData} />

              {/* Graphique 2: Moyennes par jour de la semaine */}
              <WeeklyAveragePowerChart data={loadCurveData} />

              {/* Section debug: Données brutes (collapsible) */}
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-gray-900 mb-2">
                  Afficher les données brutes JSON ({loadCurveData.length} points)
                </summary>
                <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-60 mt-2">
                  {JSON.stringify(loadCurveData.slice(0, 50), null, 2)}
                  {loadCurveData.length > 50 && '\n... (affichage limité aux 50 premiers points)'}
                </pre>
              </details>
            </div>
          ) : null}

          {/* Message si format CSV */}
          {loadCurveData && format === 'csv' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-700">
                Les données CSV ont été téléchargées. Pour visualiser les graphiques, sélectionnez le format JSON.
              </p>
            </div>
          )}

          {/* Analyse d'autoconsommation */}
          {loadCurveData && format === 'json' && Array.isArray(loadCurveData) && loadCurveData.length > 0 && (
            <AutoconsumptionAnalysis loadCurveData={loadCurveData} />
          )}

          {/* Bouton pour réinitialiser */}
          <button
            onClick={() => {
              setStep(1);
              setOrder(null);
              setOrderStatus(null);
              setLoadCurveData(null);
              setError(null);
            }}
            className="w-full mt-6 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Nouvelle commande
          </button>
        </div>
      )}
    </div>
  );
};

export default LoadCurveSection;
