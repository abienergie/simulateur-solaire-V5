import React, { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Calendar, TrendingUp, Zap, BarChart3 } from 'lucide-react';

interface ConsumptionData {
  date: string;
  peak_hours: number;
  off_peak_hours: number;
  total: number;
}

interface ConsumptionAnalysisChartProps {
  data: ConsumptionData[];
  title?: string;
}

const ConsumptionAnalysisChart: React.FC<ConsumptionAnalysisChartProps> = ({ 
  data, 
  title = "Consommation sur les 365 derniers jours" 
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
        peakHours: item.peak_hours || 0,
        offPeakHours: item.off_peak_hours || 0,
        total: item.total || (item.peak_hours + item.off_peak_hours),
        month: new Date(item.date).getMonth() + 1,
        dayOfWeek: new Date(item.date).getDay()
      }));
  }, [data]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const totalConsumption = chartData.reduce((sum, item) => sum + item.total, 0);
    const totalPeakHours = chartData.reduce((sum, item) => sum + item.peakHours, 0);
    const totalOffPeakHours = chartData.reduce((sum, item) => sum + item.offPeakHours, 0);
    const avgDaily = totalConsumption / chartData.length;
    const maxDaily = Math.max(...chartData.map(item => item.total));
    const minDaily = Math.min(...chartData.map(item => item.total));
    
    // Calculer les moyennes par saison
    const seasonalData = chartData.reduce((acc, item) => {
      let season = '';
      if (item.month >= 3 && item.month <= 5) season = 'Printemps';
      else if (item.month >= 6 && item.month <= 8) season = 'Été';
      else if (item.month >= 9 && item.month <= 11) season = 'Automne';
      else season = 'Hiver';
      
      if (!acc[season]) {
        acc[season] = { total: 0, count: 0 };
      }
      acc[season].total += item.total;
      acc[season].count += 1;
      
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const seasonalAverages = Object.entries(seasonalData).map(([season, data]) => ({
      season,
      average: data.total / data.count
    }));

    return {
      totalConsumption,
      totalPeakHours,
      totalOffPeakHours,
      avgDaily,
      maxDaily,
      minDaily,
      peakPercentage: (totalPeakHours / totalConsumption) * 100,
      offPeakPercentage: (totalOffPeakHours / totalConsumption) * 100,
      seasonalAverages,
      period: chartData.length
    };
  }, [chartData]);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucune donnée de consommation disponible</p>
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
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <p className="text-sm text-blue-600 font-medium">Période analysée</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.period} jours</p>
            <p className="text-xs text-blue-500 mt-1">
              {chartData[0]?.dateLabel} au {chartData[chartData.length - 1]?.dateLabel}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <p className="text-sm text-green-600 font-medium">Consommation totale</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {Math.round(stats.totalConsumption).toLocaleString()} kWh
            </p>
            <p className="text-xs text-green-500 mt-1">
              Moyenne: {stats.avgDaily.toFixed(1)} kWh/jour
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-purple-500" />
              <p className="text-sm text-purple-600 font-medium">Pics de consommation</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {stats.maxDaily.toFixed(1)} kWh
            </p>
            <p className="text-xs text-purple-500 mt-1">
              Min: {stats.minDaily.toFixed(1)} kWh
            </p>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-600 font-medium">Répartition HP/HC</p>
            </div>
            <p className="text-lg font-bold text-amber-700">
              {stats.peakPercentage.toFixed(0)}% / {stats.offPeakPercentage.toFixed(0)}%
            </p>
            <p className="text-xs text-amber-500 mt-1">
              Heures pleines / Heures creuses
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
              label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'total') return [`${value.toFixed(2)} kWh`, 'Consommation totale'];
                if (name === 'peakHours') return [`${value.toFixed(2)} kWh`, 'Heures pleines'];
                if (name === 'offPeakHours') return [`${value.toFixed(2)} kWh`, 'Heures creuses'];
                return [value, name];
              }}
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
              dataKey="total" 
              name="total"
              stroke="#3B82F6" 
              fill="#3B82F6" 
              fillOpacity={0.2}
              strokeWidth={2}
            />
            {/* Ligne de référence pour la moyenne */}
            {stats && (
              <ReferenceLine 
                y={stats.avgDaily} 
                stroke="#10B981" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ 
                  value: `Moyenne: ${stats.avgDaily.toFixed(1)} kWh/jour`, 
                  position: "topRight",
                  style: { fill: '#10B981', fontSize: '12px', fontWeight: 'bold' }
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Analyse saisonnière */}
      {stats && stats.seasonalAverages.length > 0 && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Analyse saisonnière</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.seasonalAverages.map(({ season, average }) => (
              <div key={season} className="text-center">
                <p className="text-sm font-medium text-gray-700">{season}</p>
                <p className="text-lg font-bold text-blue-600">{average.toFixed(1)} kWh/jour</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumptionAnalysisChart;