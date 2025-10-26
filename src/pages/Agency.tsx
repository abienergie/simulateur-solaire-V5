import React, { useState } from 'react';
import { AlertCircle, Briefcase, Building2, CheckCircle2, Loader2, Lock, TrendingUp, Users, FileDown } from 'lucide-react';
import { useAgencyCommissions } from '../hooks/useAgencyCommissions';

const ACCESS_CODE = '151515';

export default function Agency() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const { commissions, loading, error: commissionsError } = useAgencyCommissions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === ACCESS_CODE) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Code d\'accès incorrect');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-start bg-gray-50 px-4 pt-12">
        <div className="max-w-md w-full mx-auto">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Accès restreint
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Veuillez saisir le code d'accès pour consulter les informations agence
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
            <div className="space-y-4">
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Code d'accès
                </label>
                <input
                  id="accessCode"
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Entrez le code d'accès"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Accéder
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (commissionsError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p>Erreur lors du chargement des commissions</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate max commission
  const maxCommission = commissions?.reduce((max, commission) => 
    Math.max(max, commission.commission_super_regie || 0), 0
  ) || 0;

  const generatePDF = () => {
    const today = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    const tableRows = [
      { power: 2.5, commission: 700 },
      { power: 3.0, commission: 1000 },
      { power: 3.5, commission: 1000 },
      { power: 4.0, commission: 1200 },
      { power: 4.5, commission: 1400 },
      { power: 5.0, commission: 1700 },
      { power: 5.5, commission: 2000 },
      { power: 6.0, commission: 2300 },
      { power: 6.5, commission: 2400 },
      { power: 7.0, commission: 2500 },
      { power: 7.5, commission: 2700 },
      { power: 8.0, commission: 2800 },
      { power: 8.5, commission: 2900 },
      { power: 9.0, commission: 3000 },
      { power: 12.0, commission: 3500 },
      { power: 15.0, commission: 4000 },
      { power: 18.0, commission: 5000 },
      { power: 20.0, commission: 6000 },
      { power: 25.0, commission: 8000 },
      { power: 30.0, commission: 10000 },
      { power: 36.0, commission: 12000 }
    ];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Barème des commissions agence - ${today}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 10px;
              font-size: 12px;
            }
            h1 { 
              color: #1f2937; 
              text-align: center; 
              font-size: 18px;
              margin: 5px 0;
            }
            .date { 
              text-align: center; 
              color: #6b7280; 
              margin-bottom: 15px;
              font-size: 11px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0;
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #d1d5db; 
              padding: 4px 8px; 
              text-align: center; 
            }
            th { 
              background-color: #f9fafb; 
              font-weight: bold;
              font-size: 12px;
            }
            tr:nth-child(even) { background-color: #f9fafb; }
            .note { 
              margin-top: 15px; 
              padding: 10px; 
              background-color: #dbeafe; 
              border-radius: 8px;
              font-size: 10px;
              line-height: 1.3;
            }
            @media print {
              body { 
                margin: 5px;
                font-size: 11px;
              }
              h1 { font-size: 16px; }
              .note { page-break-inside: avoid; }
              table { font-size: 10px; }
              th, td { padding: 3px 6px; }
            }
          </style>
        </head>
        <body>
          <h1>Barème des commissions agence (abonnement)</h1>
          <div class="date">Édité le ${today}</div>
          <table>
            <thead>
              <tr>
                <th>Puissance crête</th>
                <th>Commission agence</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows.map(item => `
                <tr>
                  <td>${item.power.toFixed(1)} kWc</td>
                  <td>${item.commission.toLocaleString('fr-FR')} €</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="note">
            <strong>Note :</strong> Les commissions agence sont versées à la mise en service de l'installation. 
            Un acompte est possible avant la pose dès réception de l'accord mairie.
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    // Créer un blob avec le contenu HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Ouvrir dans une nouvelle fenêtre
    const printWindow = window.open(url, '_blank');
    
    // Nettoyer l'URL après un délai
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Informations agence
        </h1>
        <p className="mt-2 text-gray-600">
          Barème applicable aux commerciaux et super régies
        </p>
      </div>

    <>
      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <h3 className="font-medium text-blue-900">Commission moyenne</h3>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            3 800€
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Toutes puissances confondues
          </p>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="h-6 w-6 text-green-500" />
            <h3 className="font-medium text-green-900">Évolution tarifaire</h3>
          </div>
          <p className="text-2xl font-bold text-green-700">
            +500€
          </p>
          <p className="text-sm text-green-600 mt-1">
            Augmentation moyenne par palier
          </p>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Briefcase className="h-6 w-6 text-purple-500" />
            <h3 className="font-medium text-purple-900">Commission maximale</h3>
          </div>
          <p className="text-2xl font-bold text-purple-700">
            12 000 €
          </p>
          <p className="text-sm text-purple-600 mt-1">
            Pour les installations 36 kWc
          </p>
        </div>
      </div>
    </>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">
              Barème détaillé (abonnement)
            </h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Puissance crête
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission agence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { power: 2.5, commission: 700 },
                { power: 3.0, commission: 1000 },
                { power: 3.5, commission: 1000 },
                { power: 4.0, commission: 1200 },
                { power: 4.5, commission: 1400 },
                { power: 5.0, commission: 1700 },
                { power: 5.5, commission: 2000 },
                { power: 6.0, commission: 2300 },
                { power: 6.5, commission: 2400 },
                { power: 7.0, commission: 2500 },
                { power: 7.5, commission: 2700 },
                { power: 8.0, commission: 2800 },
                { power: 8.5, commission: 2900 },
                { power: 9.0, commission: 3000 },
                { power: 12.0, commission: 3500 },
                { power: 15.0, commission: 4000 },
                { power: 18.0, commission: 5000 },
                { power: 20.0, commission: 6000 },
                { power: 25.0, commission: 8000 },
                { power: 30.0, commission: 10000 },
                { power: 36.0, commission: 12000 }
              ].map((item, index) => {
                const isProInstallation = item.power > 9;
                return (
                <tr key={item.power} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${item.power === 9.0 ? 'border-b-4 border-blue-500' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.power.toFixed(1)} kWc
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {item.commission.toLocaleString('fr-FR')} €
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note :</strong> Les commissions agence sont versées à la mise en service de l'installation. 
              Un acompte est possible avant la pose dès réception de l'accord mairie.
            </p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={generatePDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileDown className="h-5 w-5" />
              Imprimer le barème
            </button>
          </div>
        </div>
      </div>
  );
}