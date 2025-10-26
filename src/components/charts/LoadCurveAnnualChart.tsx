import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LoadCurveDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

interface LoadCurveAnnualChartProps {
  data: LoadCurveDataPoint[];
  title?: string;
}

const LoadCurveAnnualChart: React.FC<LoadCurveAnnualChartProps> = ({
  data,
  title = "Courbe de charge annuelle (365 jours)"
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">Aucune donnée disponible pour afficher le graphique</p>
      </div>
    );
  }

  // Vérifier la structure des données
  const firstPoint = data[0];
  if (!firstPoint.timestamp || firstPoint.value === undefined) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <p className="text-red-600 font-semibold mb-2">Format de données incorrect</p>
        <p className="text-sm text-red-500">
          Attendu: {`{timestamp: string, value: number, unit: string}`}
        </p>
      </div>
    );
  }

  // Transformer les données pour Recharts
  const allChartData = data.map(point => ({
    timestamp: point.timestamp,
    date: parseISO(point.timestamp),
    power: parseFloat(point.value.toString()),
    displayDate: format(parseISO(point.timestamp), 'dd/MM HH:mm', { locale: fr })
  }));

  // Trier par date décroissante et prendre les 365 derniers jours (17520 demi-heures)
  const oneYearInHalfHours = 365 * 24 * 2; // 17520 points
  const sortedData = [...allChartData].sort((a, b) => b.date.getTime() - a.date.getTime());
  const lastYearData = sortedData.slice(0, oneYearInHalfHours);
  // Re-trier par ordre chronologique croissant pour l'affichage
  const chartData = lastYearData.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculer les statistiques
  const powers = chartData.map(d => d.power);
  const maxPower = Math.max(...powers);

  // Calculer la consommation totale en kWh
  // Les valeurs sont en kW (puissance moyenne sur 30 min)
  // Consommation = Puissance * Durée = kW * 0.5h = kWh
  const totalConsumption = powers.reduce((sum, power) => sum + (power * 0.5), 0);

  // Formatter pour l'axe X (afficher seulement quelques dates)
  const formatXAxis = (tickItem: string) => {
    try {
      return format(parseISO(tickItem), 'dd/MM', { locale: fr });
    } catch {
      return '';
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {format(data.date, 'EEEE dd MMMM yyyy', { locale: fr })}
          </p>
          <p className="text-sm text-gray-700">
            {format(data.date, 'HH:mm', { locale: fr })}
          </p>
          <p className="text-sm font-medium text-blue-600 mt-2">
            Puissance: {data.power.toFixed(2)} kW
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-gray-600 mb-1">Consommation totale</p>
            <p className="text-xl font-bold text-blue-600">{totalConsumption.toFixed(0)} kWh</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-gray-600 mb-1">Puissance max</p>
            <p className="text-xl font-bold text-red-600">{maxPower.toFixed(2)} kW</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Nombre de points: {chartData.length.toLocaleString()} (365 jours)
        </p>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12 }}
              interval={Math.floor(chartData.length / 12)}
            />
            <YAxis
              label={{ value: 'Puissance (kW)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="power"
              stroke="#3b82f6"
              strokeWidth={1}
              dot={false}
              name="Puissance (kW)"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LoadCurveAnnualChart;
