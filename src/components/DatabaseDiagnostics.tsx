import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { runDatabaseDiagnostics, logDatabaseDiagnostics, DatabaseDiagnostics } from '../utils/api/supabaseDebugger';
import { formatCurrency } from '../utils/formatters';

export default function DatabaseDiagnosticsComponent() {
  const [diagnostics, setDiagnostics] = useState<DatabaseDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await runDatabaseDiagnostics();
      setDiagnostics(results);
      logDatabaseDiagnostics(results);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string | boolean) => {
    if (status === 'connected' || status === true) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status === 'error' || status === false) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Diagnostics de base de données</h3>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
          Actualiser
        </button>
      </div>

      {diagnostics && (
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {getStatusIcon(diagnostics.connectionStatus)}
            <div>
              <h4 className="font-medium">Connexion Supabase</h4>
              <p className="text-sm text-gray-600">
                Statut: {diagnostics.connectionStatus === 'connected' ? 'Connecté' : 'Erreur'}
              </p>
            </div>
          </div>

          {/* Subscription Prices */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              {getStatusIcon(diagnostics.subscriptionPricesStatus.tableExists)}
              <h4 className="font-medium">Table subscription_prices</h4>
            </div>
            
            <div className="space-y-2 text-sm">
              <p>Enregistrements: {diagnostics.subscriptionPricesStatus.recordCount}</p>
              
              {diagnostics.subscriptionPricesStatus.error && (
                <p className="text-red-600">Erreur: {diagnostics.subscriptionPricesStatus.error}</p>
              )}
              
              {diagnostics.subscriptionPricesStatus.sampleData.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium mb-2">Échantillon de données:</p>
                  <div className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                    <pre>{JSON.stringify(diagnostics.subscriptionPricesStatus.sampleData, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Battery Prices */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              {getStatusIcon(diagnostics.batteryPricesStatus.tableExists)}
              <h4 className="font-medium">Table battery_prices_purchase</h4>
            </div>

            <div className="space-y-2 text-sm">
              <p>Enregistrements: {diagnostics.batteryPricesStatus.recordCount}</p>

              {diagnostics.batteryPricesStatus.error && (
                <p className="text-red-600">Erreur: {diagnostics.batteryPricesStatus.error}</p>
              )}

              {diagnostics.batteryPricesStatus.sampleData.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium mb-2">Échantillon de données:</p>
                  <div className="space-y-1">
                    {diagnostics.batteryPricesStatus.sampleData.map((battery, index) => (
                      <div key={index} className="flex justify-between bg-gray-50 p-2 rounded">
                        <span>{battery.model} ({battery.capacity} kWh)</span>
                        <span>{formatCurrency(battery.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subsidies */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              {getStatusIcon(diagnostics.subsidiesStatus.tableExists)}
              <h4 className="font-medium">Table subsidies (Primes et Tarifs de rachat)</h4>
            </div>

            <div className="space-y-2 text-sm">
              <p>Enregistrements: {diagnostics.subsidiesStatus.recordCount}</p>

              {diagnostics.subsidiesStatus.error && (
                <p className="text-red-600">Erreur: {diagnostics.subsidiesStatus.error}</p>
              )}

              {diagnostics.subsidiesStatus.sampleData.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium mb-2">Données actuelles:</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Puissance</th>
                          <th className="px-3 py-2 text-right">Prime (€/kWc)</th>
                          <th className="px-3 py-2 text-right">Revente totale (€/kWh)</th>
                          <th className="px-3 py-2 text-right">Revente surplus (€/kWh)</th>
                          <th className="px-3 py-2 text-left">Date d'effet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {diagnostics.subsidiesStatus.sampleData.map((subsidy, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{subsidy.power_range} kWc</td>
                            <td className="px-3 py-2 text-right">{subsidy.amount} €/kWc</td>
                            <td className="px-3 py-2 text-right">{subsidy.tarif_revente_totale} €/kWh</td>
                            <td className="px-3 py-2 text-right">{subsidy.tarif_revente_surplus} €/kWh</td>
                            <td className="px-3 py-2">{new Date(subsidy.effective_date).toLocaleDateString('fr-FR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}