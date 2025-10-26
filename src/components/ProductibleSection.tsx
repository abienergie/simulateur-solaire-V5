import React, { useState, useEffect } from 'react';
import { Sun, Loader2, AlertCircle, BarChart3, Calculator } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from 'recharts';
import { getPVGISData } from '../utils/api/pvgisApi';

interface ProductibleSectionProps {
  coordinates: { lat: number; lon: number };
  puissanceCrete: number;
  orientation: number;
  inclinaison: number;
  pertes: number;
}

interface PVGISResult {
  productionAnnuelle: number;
  productionMensuelle: number[];
  irradiationAnnuelle: number;
  performanceRatio: number;
  variabiliteInterannuelle: number;
}

export default function ProductibleSection({
  coordinates,
  puissanceCrete,
  orientation,
  inclinaison,
  pertes
}: ProductibleSectionProps) {
  const [result, setResult] = useState<PVGISResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProductible, setShowProductible] = useState(false);

  const handleCalculateProductible = async () => {
    if (!coordinates || puissanceCrete <= 0) {
      setError('Coordonnées ou puissance manquantes');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pvgisData = await getPVGISData({
        lat: coordinates.lat,
        lon: coordinates.lon,
        peakPower: puissanceCrete,
        systemLoss: pertes,
        tilt: inclinaison,
        azimuth: orientation
      });

      // Traitement des données PVGIS
      const productionAnnuelle = pvgisData.outputs.totals.fixed.E_y || 0;
      const productionMensuelle = pvgisData.outputs.monthly.fixed.map((month: any) => month.E_m || 0);
      const irradiationAnnuelle = pvgisData.outputs.totals.fixed.H_i_y || 0;
      const variabiliteInterannuelle = pvgisData.outputs.totals.fixed.SD_y || 0;
      
      // Calcul du ratio de performance selon la formule PVGIS
      const performanceRatio = irradiationAnnuelle > 0 && puissanceCrete > 0
        ? (productionAnnuelle / (irradiationAnnuelle * puissanceCrete)) * 100
        : 85;

      setResult({
        productionAnnuelle,
        productionMensuelle,
        irradiationAnnuelle,
        performanceRatio,
        variabiliteInterannuelle
      });
      
      // Mettre à jour les résultats solaires avec la production PVGIS réelle
      const currentResults = localStorage.getItem('solarResults');
      if (currentResults) {
        try {
          const results = JSON.parse(currentResults);
          const updatedResults = {
            ...results,
            productionAnnuelle: Math.round(productionAnnuelle)
          };
          localStorage.setItem('solarResults', JSON.stringify(updatedResults));
          
          // Déclencher un événement pour notifier les autres composants
          window.dispatchEvent(new CustomEvent('pvgisResultsUpdated', {
            detail: { productionAnnuelle: Math.round(productionAnnuelle) }
          }));
        } catch (error) {
          console.error('Erreur lors de la mise à jour des résultats solaires:', error);
        }
      }
      
      setShowProductible(true);
    } catch (err) {
      console.error('Erreur PVGIS:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul PVGIS');
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate when parameters change (optional - can be removed if you want manual only)
  useEffect(() => {
    const calculatePVGIS = async () => {
      if (!coordinates || puissanceCrete <= 0 || !showProductible) {
        return;
      }

      // Recalculate automatically if productible is already shown
      handleCalculateProductible();
    };

    const timeoutId = setTimeout(calculatePVGIS, 500);
    return () => clearTimeout(timeoutId);
  }, [coordinates, puissanceCrete, orientation, inclinaison, pertes, showProductible]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="h-6 w-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Productible</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Calcul du productible en cours...</p>
            <p className="text-sm text-gray-500 mt-1">Données PVGIS de la Commission Européenne</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="h-6 w-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Productible</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Erreur de calcul</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={handleCalculateProductible}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-3 mb-6">
          <Sun className="h-6 w-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Productible</h3>
        </div>

        {!showProductible ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">
              Calculez la production mensuelle de votre installation avec les données officielles PVGIS
            </p>
            <button
              onClick={handleCalculateProductible}
              disabled={loading || !coordinates || puissanceCrete <= 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  <Calculator className="h-5 w-5" />
                  Calculer le productible
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">En attente des paramètres d'installation</p>
          </div>
        )}
      </div>
    );
  }

  // Préparer les données pour le graphique
  const chartData = result.productionMensuelle.map((production, index) => {
    const mois = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ][index];
    
    return {
      mois,
      production: Number(production) || 0,
      productionPerKwc: Number(production) / puissanceCrete || 0
    };
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center gap-3 mb-6">
        <Sun className="h-6 w-6 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Productible</h3>
      </div>

      <div className="space-y-6">
        {/* Statistiques résumées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Production annuelle</p>
            <p className="text-2xl font-bold text-blue-700">
              {Math.round(result.productionAnnuelle).toLocaleString()} kWh
            </p>
            <p className="text-xs text-blue-500 mt-1">
              {Math.round(result.productionAnnuelle / puissanceCrete)} kWh/kWc
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Ratio de performance</p>
            <p className="text-2xl font-bold text-purple-700">
              {result.performanceRatio.toFixed(1)}%
            </p>
            <p className="text-xs text-purple-500 mt-1">Efficacité système</p>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-600 font-medium">Production quotidienne</p>
            <p className="text-2xl font-bold text-orange-700">
              {(result.productionAnnuelle / 365).toFixed(1)} kWh
            </p>
            <p className="text-xs text-orange-500 mt-1">Moyenne quotidienne</p>
          </div>
        </div>

        {/* Graphique de production mensuelle */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-3">
            Production mensuelle estimée
          </h4>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="mois" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Production (kWh)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'production') return [`${value.toFixed(0)} kWh`, 'Production mensuelle'];
                    if (name === 'productionPerKwc') return [`${value.toFixed(0)} kWh/kWc`, 'Production par kWc'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Mois: ${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.375rem',
                    padding: '8px 12px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="production" 
                  name="production"
                  fill="#10B981"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Informations techniques */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Informations techniques</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p><strong>Puissance :</strong> {puissanceCrete.toFixed(1)} kWc</p>
              <p><strong>Orientation/Inclinaison :</strong> {orientation}° / {inclinaison}°</p>
              <p><strong>Pertes système :</strong> {pertes}%</p>
            </div>
            <div>
              <p><strong>Coordonnées :</strong> {coordinates.lat.toFixed(4)}°, {coordinates.lon.toFixed(4)}°</p>
              <p><strong>Irradiation annuelle :</strong> {result.irradiationAnnuelle.toFixed(0)} kWh/m²</p>
              <p><strong>Technologie :</strong> Silicium cristallin</p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">
            Données calculées avec l'API PVGIS de la Commission Européenne
          </p>
        </div>

        {/* Bouton pour recalculer */}
        <div className="text-center">
          <button
            onClick={handleCalculateProductible}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recalcul...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                Recalculer le productible
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}