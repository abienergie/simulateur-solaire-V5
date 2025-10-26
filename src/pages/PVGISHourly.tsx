import React, { useState } from 'react';
import { Sun, MapPin, Zap, Calculator, AlertCircle, CheckCircle, Loader2, BarChart3, Clock, Calendar } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { fetchPVGISHourly } from '../utils/api/pvgisHourlyApi';
import { ProcessedHourlyData } from '../types/pvgisHourly';

interface PVGISHourlyFormData {
  address: {
    rue: string;
    codePostal: string;
    ville: string;
    coordinates?: { lat: number; lon: number };
  };
  puissanceCrete: number;
  pertes: number;
  annee: number;
  orientation: number;
  inclinaison: number;
}

export default function PVGISHourly() {
  const [formData, setFormData] = useState<PVGISHourlyFormData>({
    address: {
      rue: '',
      codePostal: '',
      ville: ''
    },
    puissanceCrete: 6.0,
    pertes: 14,
    annee: 2022,
    orientation: 0,
    inclinaison: 30
  });
  
  const [hourlyData, setHourlyData] = useState<ProcessedHourlyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('chart');

  const handleAddressSelect = (
    fullAddress: string,
    postcode: string,
    city: string,
    coordinates: { lat: number; lon: number }
  ) => {
    setFormData(prev => ({
      ...prev,
      address: {
        rue: fullAddress,
        codePostal: postcode,
        ville: city,
        coordinates
      }
    }));
  };

  const handleInputChange = (field: keyof PVGISHourlyFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCalculate = async () => {
    if (!formData.address.coordinates) {
      setError('Veuillez sélectionner une adresse valide avec des coordonnées');
      return;
    }

    setLoading(true);
    setError(null);
    setHourlyData([]);

    try {
      const hourlyResults = await fetchPVGISHourly({
        lat: formData.address.coordinates.lat,
        lon: formData.address.coordinates.lon,
        peakpower: formData.puissanceCrete,
        loss: formData.pertes,
        startyear: formData.annee,
        endyear: formData.annee,
        angle: formData.inclinaison,
        aspect: formData.orientation
      });

      setHourlyData(hourlyResults);
    } catch (err) {
      console.error('Erreur PVGIS horaire:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul PVGIS horaire');
    } finally {
      setLoading(false);
    }
  };

  // Préparer les données pour le graphique (échantillonner si trop de points)
  const chartData = React.useMemo(() => {
    if (hourlyData.length === 0) return [];
    
    // Si plus de 2000 points, échantillonner (1 point sur 4)
    const sampledData = hourlyData.length > 2000 
      ? hourlyData.filter((_, index) => index % 4 === 0)
      : hourlyData;
    
    return sampledData.map((point, index) => ({
      ...point,
      index,
      shortTime: point.time,
      shortDate: point.date.substring(0, 5) // DD/MM
    }));
  }, [hourlyData]);

  // Calculer les statistiques
  const stats = React.useMemo(() => {
    if (hourlyData.length === 0) return null;
    
    const productions = hourlyData.map(d => d.production);
    const totalProduction = productions.reduce((sum, p) => sum + p, 0);
    const maxProduction = Math.max(...productions);
    
    return {
      totalProduction,
      maxProduction
    };
  }, [hourlyData]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg shadow-lg p-6 mb-8">
        <div className="flex items-center gap-3 text-white mb-4">
          <Sun className="h-8 w-8" />
          <h1 className="text-2xl font-bold">PVGIS - Calcul de production solaire</h1>
        </div>
        <p className="text-orange-100">
          Utilisez l'API officielle PVGIS de la Commission Européenne pour calculer précisément 
          la production de votre installation photovoltaïque
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Paramètres de l'installation
        </h2>

        <div className="space-y-6">
          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Adresse de l'installation
            </label>
            <AddressAutocomplete
              value={formData.address.rue}
              onChange={(value) => handleInputChange('address', { ...formData.address, rue: value })}
              onSelect={handleAddressSelect}
            />
            {formData.address.coordinates && (
              <p className="text-xs text-gray-500 mt-1">
                Coordonnées: {formData.address.coordinates.lat.toFixed(6)}, {formData.address.coordinates.lon.toFixed(6)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Puissance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Zap className="inline h-4 w-4 mr-1" />
                Puissance crête (kWc)
              </label>
              <input
                type="number"
                value={formData.puissanceCrete}
                onChange={(e) => handleInputChange('puissanceCrete', parseFloat(e.target.value) || 0)}
                min="0.5"
                max="100"
                step="0.5"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Pertes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pertes système (%)
              </label>
              <input
                type="number"
                value={formData.pertes}
                onChange={(e) => handleInputChange('pertes', parseFloat(e.target.value) || 0)}
                min="0"
                max="50"
                step="1"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Année */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Année de calcul
              </label>
              <input
                type="number"
                value={formData.annee}
                onChange={(e) => handleInputChange('annee', parseInt(e.target.value) || 2022)}
                min="2005"
                max="2023"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                Année fixée à 2022 (meilleure année disponible SARAH3)
              </p>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orientation
              </label>
              <select
                value={formData.orientation}
                onChange={(e) => handleInputChange('orientation', parseInt(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={-90}>EST</option>
                <option value={-45}>SUD-EST</option>
                <option value={0}>SUD</option>
                <option value={45}>SUD-OUEST</option>
                <option value={90}>OUEST</option>
              </select>
            </div>

            {/* Inclinaison */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inclinaison
              </label>
              <select
                value={formData.inclinaison}
                onChange={(e) => handleInputChange('inclinaison', parseInt(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {Array.from({ length: 19 }, (_, i) => {
                  const angle = i * 5;
                  return (
                    <option key={angle} value={angle}>
                      {angle}°
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Bouton de calcul */}
          <div className="flex justify-center">
            <button
              onClick={handleCalculate}
              disabled={loading || !formData.address.coordinates}
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
                  Charger la production horaire
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Affichage des erreurs */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Erreur de calcul</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Statistiques et sélecteur de vue */}
      {stats && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Production horaire {formData.annee}
            </h3>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="inline h-4 w-4 mr-1" />
                Graphique
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="inline h-4 w-4 mr-1" />
                Tableau
              </button>
            </div>
          </div>

          {/* Statistiques résumées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Production totale</p>
              <p className="text-2xl font-bold text-blue-700">
                {Math.round(stats.totalProduction)} kWh
              </p>
              <p className="text-xs text-blue-500 mt-1">Sur l'année {formData.annee}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Production maximale</p>
              <p className="text-2xl font-bold text-green-700">
                {stats.maxProduction.toFixed(2)} kWh
              </p>
              <p className="text-xs text-green-500 mt-1">Pic horaire</p>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-600 font-medium">Points de données</p>
              <p className="text-2xl font-bold text-amber-700">
                {hourlyData.length.toLocaleString()}
              </p>
              <p className="text-xs text-amber-500 mt-1">Mesures horaires</p>
            </div>
          </div>

          {/* Affichage selon le mode sélectionné */}
          {viewMode === 'chart' ? (
            <div className="space-y-6">
              {/* Graphique de production horaire */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-3">
                  Production horaire sur l'année {formData.annee}
                  {chartData.length < hourlyData.length && (
                    <span className="text-sm text-gray-500 font-normal ml-2">
                      (échantillonné : {chartData.length} points affichés sur {hourlyData.length})
                    </span>
                  )}
                </h4>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="shortDate"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 10 }}
                        interval={Math.floor(chartData.length / 20)} // Afficher ~20 labels
                      />
                      <YAxis 
                        label={{ value: 'Production (kWh)', angle: -90, position: 'insideLeft' }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [`${value.toFixed(3)} kWh`, 'Production']}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            const point = payload[0].payload;
                            return `Date: ${point.date} - Heure: ${point.time}`;
                          }
                          return label;
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.375rem',
                          padding: '8px 12px'
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="production" 
                        name="Production (kWh)"
                        stroke="#F59E0B" 
                        fill="#F59E0B" 
                        fillOpacity={0.3}
                        strokeWidth={1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            /* Mode tableau */
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-3">
                Données horaires détaillées
              </h4>
              <div className="overflow-x-auto max-h-96 border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date/Heure
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Production (kWh)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Irradiance (W/m²)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Température (°C)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hourlyData.slice(0, 100).map((point, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {point.timestamp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {point.production.toFixed(3)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {point.irradiance?.toFixed(1) || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {point.temperature?.toFixed(1) || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {hourlyData.length > 100 && (
                <p className="text-sm text-gray-500 text-center mt-4">
                  Affichage des 100 premiers points sur {hourlyData.length.toLocaleString()} disponibles
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Informations techniques */}
      {hourlyData.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Informations techniques</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p><strong>Localisation :</strong> {formData.address.ville}</p>
              <p><strong>Coordonnées :</strong> {formData.address.coordinates?.lat.toFixed(4)}°, {formData.address.coordinates?.lon.toFixed(4)}°</p>
              <p><strong>Année :</strong> {formData.annee}</p>
            </div>
            <div>
              <p><strong>Puissance :</strong> {formData.puissanceCrete} kWc</p>
              <p><strong>Pertes système :</strong> {formData.pertes}%</p>
              <p><strong>Orientation/Inclinaison :</strong> {formData.orientation}° / {formData.inclinaison}°</p>
              <p><strong>Base de données :</strong> PVGIS-SARAH3</p>
              <p><strong>Technologie :</strong> Silicium cristallin</p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">
            Données calculées avec l'API PVGIS v5.3 de la Commission Européenne - 
            Données brutes sauvegardées dans localStorage sous 'pvgis_hourly_raw'
          </p>
        </div>
      )}
    </div>
  );
}