import React, { useState } from 'react';
import { FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createC68Order, parseC68ContractData } from '../../utils/api/switchgridC68Api';

export default function C68OrderTest() {
  const [prm, setPrm] = useState('');
  const [consentId, setConsentId] = useState('');
  const [askId, setAskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await createC68Order({
        prm,
        consentId: consentId || undefined,
        askId: askId || undefined
      });

      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const contractData = result?.c68 ? parseC68ContractData(result.c68) : null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900">Test C68 Order Creation</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PRM (Point de Référence et de Mesure) *
            </label>
            <input
              type="text"
              value={prm}
              onChange={(e) => setPrm(e.target.value)}
              placeholder="14862373311505"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consent ID
              </label>
              <input
                type="text"
                value={consentId}
                onChange={(e) => setConsentId(e.target.value)}
                placeholder="334be8a8-a600-4d09-b0ec-ea034a5be41d"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ask ID (alternative)
              </label>
              <input
                type="text"
                value={askId}
                onChange={(e) => setAskId(e.target.value)}
                placeholder="d020f4fa-aba3-47a1-8f95-1b26f9d42974"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-sm text-gray-500">
            * Vous devez fournir soit un Consent ID, soit un Ask ID
          </p>

          <button
            type="submit"
            disabled={loading || !prm || (!consentId && !askId)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Création de la commande en cours...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Créer la commande C68
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">Erreur</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="font-medium text-green-900">Commande créée avec succès</h3>
              </div>
              <div className="mt-2 text-sm text-green-700">
                <p>Order ID: <code className="bg-green-100 px-2 py-0.5 rounded">{result.orderId}</code></p>
                <p>Request ID: <code className="bg-green-100 px-2 py-0.5 rounded">{result.requestId}</code></p>
              </div>
            </div>

            {contractData && (
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="font-medium text-gray-900 mb-3">Détails du contrat</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">PRM</dt>
                    <dd className="text-sm text-gray-900">{contractData.prm || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Puissance souscrite</dt>
                    <dd className="text-sm text-gray-900">{contractData.puissanceSouscrite || 'N/A'} kVA</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Formule tarifaire</dt>
                    <dd className="text-sm text-gray-900">{contractData.formuleTarifaire || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Type de compteur</dt>
                    <dd className="text-sm text-gray-900">{contractData.typeCompteur || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Calendrier distributeur</dt>
                    <dd className="text-sm text-gray-900">{contractData.calendrierDistributeur || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">État contractuel</dt>
                    <dd className="text-sm text-gray-900">{contractData.etatContractuel || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            )}

            <details className="border border-gray-200 rounded-md">
              <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium text-gray-900">
                Voir les données brutes (JSON)
              </summary>
              <pre className="p-4 bg-gray-50 text-xs overflow-x-auto">
                {JSON.stringify(result.c68, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
