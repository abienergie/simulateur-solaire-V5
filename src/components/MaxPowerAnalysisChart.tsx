import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';
import { Zap, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';

interface MaxPowerData {
  date: string;
  max_power: number;
}

interface MaxPowerAnalysisChartProps {
  data: MaxPowerData[];
  title?: string;
}

const MaxPowerAnalysisChart: React.FC<MaxPowerAnalysisChartProps> = ({ 
  data, 
  title = "Puissances maximales sur les 365 derniers jours" 
}) => {
  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Trier par date et formater
    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        date: item.date,
        dateLabel: new Date(item.date).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'short' 
        }),
        fullDate: new Date(item.date).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'long',
          year: 'numeric'
        }),
        maxPower: item.max_power,
        month: new Date(item.date).getMonth() + 1,
        dayOfWeek: new Date(item.date).getDay()
      }));
  }, [data]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const powers = chartData.map(item => item.maxPower);
    const avgPower = powers.reduce((sum, power) => sum + power, 0) / powers.length;
    const maxPower = Math.max(...powers);
    const minPower = Math.min(...powers);
    
    // Calculer les percentiles
    const sortedPowers = [...powers].sort((a, b) => a - b);
    const p95 = sortedPowers[Math.floor(sortedPowers.length * 0.95)];
    const p90 = sortedPowers[Math.floor(sortedPowers.length * 0.90)];
    const p50 = sortedPowers[Math.floor(sortedPowers.length * 0.50)];
    
    // Analyser les tendances saisonnières
    const seasonalData = chartData.reduce((acc, item) => {
      let season = '';
      if (item.month >= 3 && item.month <= 5) season = 'Printemps';
      else if (item.month >= 6 && item.month <= 8) season = 'Été';
      else if (item.month >= 9 && item.month <= 11) season = 'Automne';
      else season = 'Hiver';
      
      if (!acc[season]) {
        acc[season] = { powers: [], count: 0 };
      }
      acc[season].powers.push(item.maxPower);
      acc[season].count += 1;
      
      return acc;
    }, {} as Record<string, { powers: number[]; count: number }>);

    const seasonalAverages = Object.entries(seasonalData).map(([season, data]) => ({
      season,
      avgPower: data.powers.reduce((sum, p) => sum + p, 0) / data.powers.length,
      maxPower: Math.max(...data.powers),
      count: data.count
    }));

    // Détecter les anomalies (puissances > 2x la moyenne)
    const anomalies = chartData.filter(item => item.maxPower > avgPower * 2);
    
    return {
      avgPower,
      maxPower,
      minPower,
      p95,
      p90,
      p50,
      seasonalAverages,
      anomalies,
      period: chartData.length
    };
  }, [chartData]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucune donnée de puissance maximale disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      
      {/* Statistiques résumées */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-600 font-medium">Puissance maximale</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.maxPower.toFixed(2)} kW</p>
            <p className="text-xs text-red-500 mt-1">
              Pic absolu de l'année
            </p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <p className="text-sm text-orange-600 font-medium">Puissance moyenne</p>
            </div>
            <p className="text-2xl font-bold text-orange-700">{stats.avgPower.toFixed(2)} kW</p>
            <p className="text-xs text-orange-500 mt-1">
              Médiane: {stats.p50.toFixed(2)} kW
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <p className="text-sm text-purple-600 font-medium">95e percentile</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">{stats.p95.toFixed(2)} kW</p>
            <p className="text-xs text-purple-500 mt-1">
              90e: {stats.p90.toFixed(2)} kW
            </p>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-600 font-medium">Anomalies détectées</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{stats.anomalies.length}</p>
            <p className="text-xs text-amber-500 mt-1">
              Pics > 2x la moyenne
            </p>
          </div>
        </div>
      )}

      {/* Graphique principal */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="dateLabel"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 12 }}
              interval={Math.floor(chartData.length / 15)} // Afficher ~15 labels
            />
            <YAxis 
              label={{ value: 'Puissance (kW)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(3)} kW`, 'Puissance maximale']}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate;
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
              dataKey="maxPower" 
              name="Puissance maximale"
              stroke="#F97316" 
              fill="#F97316" 
              fillOpacity={0.2}
              strokeWidth={2}
            />
            
            {/* Lignes de référence */}
            {stats && (
              <>
                <ReferenceLine 
                  y={stats.avgPower} 
                  stroke="#10B981" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ 
                    value: `Moyenne: ${stats.avgPower.toFixed(2)} kW`, 
                    position: "topRight",
                    style: { fill: '#10B981', fontSize: '12px', fontWeight: 'bold' }
                  }}
                />
                <ReferenceLine 
                  y={stats.p95} 
                  stroke="#8B5CF6" 
                  strokeDasharray="3 3" 
                  strokeWidth={1}
                  label={{ 
                    value: `95e percentile: ${stats.p95.toFixed(2)} kW`, 
                    position: "topLeft",
                    style: { fill: '#8B5CF6', fontSize: '11px' }
                  }}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Analyse saisonnière */}
      {stats && stats.seasonalAverages.length > 0 && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Analyse saisonnière des puissances</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.seasonalAverages.map(({ season, avgPower, maxPower, count }) => (
              <div key={season} className="text-center bg-white p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700">{season}</p>
                <p className="text-lg font-bold text-orange-600">{avgPower.toFixed(2)} kW</p>
                <p className="text-xs text-gray-500">Max: {maxPower.toFixed(2)} kW</p>
                <p className="text-xs text-gray-400">{count} jours</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertes sur les anomalies */}
      {stats && stats.anomalies.length > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-2">
                {stats.anomalies.length} pic{stats.anomalies.length > 1 ? 's' : ''} de consommation détecté{stats.anomalies.length > 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-amber-800 mb-2">
                Ces pics exceptionnels (> {(stats.avgPower * 2).toFixed(2)} kW) peuvent indiquer :
              </p>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Démarrage simultané d'appareils énergivores</li>
                <li>• Chauffage électrique en période de grand froid</li>
                <li>• Besoin d'optimisation de la répartition des charges</li>
              </ul>
              {stats.anomalies.length <= 3 && (
                <div className="mt-3">
                  <p className="text-xs text-amber-700 font-medium">Dates des pics :</p>
                  <p className="text-xs text-amber-700">
                    {stats.anomalies.map(a => new Date(a.date).toLocaleDateString('fr-FR')).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaxPowerAnalysisChart;