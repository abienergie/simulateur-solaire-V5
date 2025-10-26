import React, { useState } from 'react';
import { Sun, Battery, Zap, TrendingUp, AlertCircle, Leaf, ArrowUp, ArrowDown } from 'lucide-react';
import { calculateAutoconsumption } from '../../utils/calculations/autoconsumptionCalculator';
import { fetchPVGISHourly } from '../../utils/api/pvgisHourlyApi';
import AutoconsumptionChart from '../charts/AutoconsumptionChart';

interface LoadCurveDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

interface SolarProjectParams {
  peakPower: number;
  orientation: number;
  tilt: number;
  latitude: number;
  longitude: number;
}

interface AutoconsumptionAnalysisProps {
  loadCurveData: LoadCurveDataPoint[];
}

const AutoconsumptionAnalysis: React.FC<AutoconsumptionAnalysisProps> = ({ loadCurveData }) => {
  const [solarParams, setSolarParams] = useState<SolarProjectParams>({
    peakPower: 3,
    orientation: 0,
    tilt: 30,
    latitude: 48.8566,
    longitude: 2.3522
  });

  const [pvgisData, setPvgisData] = useState<any[]>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeBattery, setIncludeBattery] = useState(false);
  const [batteryCapacity, setBatteryCapacity] = useState(5);
  const [metrics, setMetrics] = useState<any>(null);

  const orientationOptions = [
    { value: -90, label: 'Est (-90°)' },
    { value: -45, label: 'Sud-Est (-45°)' },
    { value: 0, label: 'Sud (0°)' },
    { value: 45, label: 'Sud-Ouest (45°)' },
    { value: 90, label: 'Ouest (90°)' }
  ];

  const tiltOptions = [
    { value: 0, label: 'Horizontal (0°)' },
    { value: 15, label: '15°' },
    { value: 30, label: '30°' },
    { value: 35, label: '35°' },
    { value: 45, label: '45°' }
  ];

  const handleFetchPVGIS = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🌐 Fetching PVGIS data using shared API...');

      // Utiliser la fonction déjà structurée de pvgisHourlyApi
      const processedData = await fetchPVGISHourly({
        lat: solarParams.latitude,
        lon: solarParams.longitude,
        peakpower: solarParams.peakPower,
        loss: 14,
        angle: solarParams.tilt,
        aspect: solarParams.orientation,
        startyear: 2020,
        endyear: 2020
      });

      setPvgisData(processedData);
      console.log('✅ PVGIS data received:', processedData.length, 'points');
      console.log('📋 Sample point:', processedData[0]);

      // Calculer les métriques d'autoconsommation
      console.log('📊 Calculating autoconsumption with processed PVGIS data');
      const calculatedMetrics = calculateAutoconsumption(
        loadCurveData,
        processedData,
        includeBattery ? batteryCapacity : 0
      );
      setMetrics(calculatedMetrics);
      console.log('✅ Autoconsumption metrics calculated:', calculatedMetrics);

    } catch (err) {
      console.error('❌ Error fetching PVGIS:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération PVGIS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 mt-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
          <Sun className="h-5 w-5 mr-2 text-yellow-500" />
          Analyse d'Autoconsommation
        </h3>
        <p className="text-sm text-gray-600">
          Croisez vos données de consommation avec la production solaire pour calculer votre taux d'autoconsommation
        </p>
      </div>

      {/* Paramètres du projet solaire */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
          <Sun className="h-4 w-4 mr-2 text-blue-600" />
          Paramètres du projet solaire
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Puissance crête */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Puissance crête (kWc)
            </label>
            <input
              type="number"
              value={solarParams.peakPower}
              onChange={(e) => setSolarParams({ ...solarParams, peakPower: parseFloat(e.target.value) })}
              min="0.5"
              max="100"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Orientation (azimut)
            </label>
            <select
              value={solarParams.orientation}
              onChange={(e) => setSolarParams({ ...solarParams, orientation: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {orientationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Inclinaison */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inclinaison
            </label>
            <select
              value={solarParams.tilt}
              onChange={(e) => setSolarParams({ ...solarParams, tilt: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {tiltOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Latitude */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Latitude
            </label>
            <input
              type="number"
              value={solarParams.latitude}
              onChange={(e) => setSolarParams({ ...solarParams, latitude: parseFloat(e.target.value) })}
              step="0.0001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Longitude */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Longitude
            </label>
            <input
              type="number"
              value={solarParams.longitude}
              onChange={(e) => setSolarParams({ ...solarParams, longitude: parseFloat(e.target.value) })}
              step="0.0001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Option batterie */}
        <div className="mt-4 p-3 bg-white rounded border border-gray-200">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={includeBattery}
              onChange={(e) => setIncludeBattery(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Battery className="h-4 w-4 ml-2 mr-1 text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              Inclure une batterie virtuelle
            </span>
          </label>

          {includeBattery && (
            <div className="mt-3 ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacité de la batterie (kWh)
              </label>
              <input
                type="number"
                value={batteryCapacity}
                onChange={(e) => setBatteryCapacity(parseFloat(e.target.value))}
                min="2"
                max="20"
                step="0.5"
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Bouton calculer */}
        <button
          onClick={handleFetchPVGIS}
          disabled={loading || !loadCurveData || loadCurveData.length === 0}
          className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Calcul en cours...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Calculer l'autoconsommation
            </>
          )}
        </button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Erreur</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      {metrics && (
        <div className="space-y-6">
          {/* Indicateurs principaux */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Taux d'autoconsommation</h4>
                <Leaf className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-700">
                {metrics.autoconsumptionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600 mt-1">
                De votre production consommée directement
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Taux d'autoproduction</h4>
                <Sun className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-700">
                {metrics.selfProductionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600 mt-1">
                De votre consommation couverte par le solaire
              </p>
            </div>
          </div>

          {/* Flux énergétiques */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Flux énergétiques annuels</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Consommation</p>
                <p className="text-lg font-bold text-blue-700">
                  {metrics.totalConsumption.toFixed(0)} kWh
                </p>
              </div>

              <div className="text-center p-3 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-xs text-gray-600 mb-1">Production</p>
                <p className="text-lg font-bold text-yellow-700">
                  {metrics.totalProduction.toFixed(0)} kWh
                </p>
              </div>

              <div className="text-center p-3 bg-green-50 rounded border border-green-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-green-600" />
                  <p className="text-xs text-gray-600">Autoconso</p>
                </div>
                <p className="text-lg font-bold text-green-700">
                  {metrics.totalAutoconsumption.toFixed(0)} kWh
                </p>
              </div>

              <div className="text-center p-3 bg-orange-50 rounded border border-orange-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowUp className="h-3 w-3 text-orange-600" />
                  <p className="text-xs text-gray-600">Surplus</p>
                </div>
                <p className="text-lg font-bold text-orange-700">
                  {metrics.totalSurplus.toFixed(0)} kWh
                </p>
              </div>

              <div className="text-center p-3 bg-red-50 rounded border border-red-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowDown className="h-3 w-3 text-red-600" />
                  <p className="text-xs text-gray-600">Soutirage</p>
                </div>
                <p className="text-lg font-bold text-red-700">
                  {metrics.totalGridImport.toFixed(0)} kWh
                </p>
              </div>
            </div>
          </div>

          {/* Graphique de croisement */}
          <AutoconsumptionChart data={metrics.hourlyData} />
        </div>
      )}
    </div>
  );
};

export default AutoconsumptionAnalysis;
