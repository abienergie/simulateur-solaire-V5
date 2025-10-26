import React, { useState, useEffect } from 'react';
import { Sun, MapPin, Zap, Calculator, AlertCircle, CheckCircle, Loader2, BarChart3, TrendingUp } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from 'recharts';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { ORIENTATION_OPTIONS, TILT_OPTIONS } from '../utils/orientationMapping';
import { getPVGISData } from '../utils/api/pvgisApi';

interface PVGISFormData {
  address: {
    rue: string;
    codePostal: string;
    ville: string;
    coordinates?: { lat: number; lon: number };
  };
  puissanceCrete: number;
  orientation: number;
  inclinaison: number;
}

interface PVGISResult {
  productionAnnuelle: number;
  productionMensuelle: number[];
  irradiationAnnuelle: number;
  performanceRatio: number;
  variabiliteInterannuelle: number;
}

export default function PVGIS() {
  const [formData, setFormData] = useState<PVGISFormData>({
    address: {
      rue: '',
      codePostal: '',
      ville: ''
    },
    puissanceCrete: 3.0,
    orientation: 0,
    inclinaison: 30
  });
  
  const [result, setResult] = useState<PVGISResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleInputChange = (field: keyof PVGISFormData, value: any) => {
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
    setResult(null);

    try {
      // Appel à l'API PVGIS
      const pvgisData = await getPVGISData({
        lat: formData.address.coordinates.lat,
        lon: formData.address.coordinates.lon,
        peakPower: formData.puissanceCrete,
        systemLoss: 14, // Pertes système par défaut
        tilt: formData.inclinaison,
        azimuth: formData.orientation
      });

      // Traitement des données PVGIS
      const productionAnnuelle = pvgisData.outputs.totals.fixed.E_y || 0;
      const productionMensuelle = pvgisData.outputs.monthly.fixed.map(month => month.E_m || 0);
      const irradiationAnnuelle = pvgisData.outputs.totals.fixed.H_i_y || 0;
      const variabiliteInterannuelle = pvgisData.outputs.totals.fixed.SD_y || 0;
      
      // Calcul du ratio de performance selon la formule PVGIS
      // PR = (Production réelle kWh/an) / (Irradiation kWh/m² × Puissance kWc) × 100
      const performanceRatio = irradiationAnnuelle > 0 && formData.puissanceCrete > 0
        ? (productionAnnuelle / (irradiationAnnuelle * formData.puissanceCrete)) * 100
        : 85; // Valeur par défaut réaliste pour le photovoltaïque

      setResult({
        productionAnnuelle,
        productionMensuelle,
        irradiationAnnuelle,
        performanceRatio,
        variabiliteInterannuelle
      });
    } catch (err) {
      console.error('Erreur PVGIS:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul PVGIS');
    } finally {
      setLoading(false);
    }
  };

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
              {ORIENTATION_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
              {TILT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
                  Calculer avec PVGIS
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

      {/* Graphique de production mensuelle */}
      {result && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Production mensuelle estimée</h3>
          <div className="h-80 w-full">
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={result.productionMensuelle.map((production, index) => {
                  const mois = [
                    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
                  ][index];
                  
                  return {
                    mois,
                    production: Number(production) || 0,
                    productionPerKwc: Number(production) / formData.puissanceCrete || 0
                  };
                })}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
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
        </div>
      )}

      {/* Affichage des résultats */}
      {result && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-xl font-semibold text-gray-900">
              Résultats PVGIS
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Production annuelle</p>
              <p className="text-2xl font-bold text-blue-700">
                {Math.round(result.productionAnnuelle).toLocaleString()} kWh
              </p>
              <p className="text-xs text-blue-500 mt-1">
                {Math.round(result.productionAnnuelle / formData.puissanceCrete)} kWh/kWc
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
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Production mensuelle estimée
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {result.productionMensuelle.map((production, index) => {
                const mois = [
                  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
                ][index];
                
                return (
                  <div key={index} className="bg-white p-3 rounded-lg text-center">
                    <p className="text-sm font-medium text-gray-700">{mois}</p>
                    <p className="text-lg font-bold text-blue-600">
                      {Math.round(production)} kWh
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Informations techniques */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Informations techniques</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p><strong>Localisation :</strong> {formData.address.ville}</p>
                <p><strong>Coordonnées :</strong> {formData.address.coordinates?.lat.toFixed(4)}°, {formData.address.coordinates?.lon.toFixed(4)}°</p>
              </div>
              <div>
                <p><strong>Puissance :</strong> {formData.puissanceCrete} kWc</p>
                <p><strong>Orientation/Inclinaison :</strong> {formData.orientation}° / {formData.inclinaison}°</p>
                <p><strong>Pertes système :</strong> 14%</p>
                <p><strong>Technologie :</strong> Silicium cristallin (2025 si disponible)</p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              Données calculées avec l'API PVGIS de la Commission Européenne
            </p>
          </div>
        </div>
      )}
    </div>
  );
}