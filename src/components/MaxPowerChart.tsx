import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MaxPowerDataPoint {
  date: string;
  power_max_kw: number;
  time_of_max?: string | null;
}

interface MaxPowerChartProps {
  data: MaxPowerDataPoint[];
  loading?: boolean;
  error?: string | null;
}

const MaxPowerChart: React.FC<MaxPowerChartProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Chargement des données...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Aucune donnée disponible</div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    }),
    fullDate: item.date,
    puissance: item.power_max_kw,
    time: item.time_of_max
  }));

  const maxPower = Math.max(...data.map(d => d.power_max_kw));
  const avgPower = data.reduce((sum, d) => sum + d.power_max_kw, 0) / data.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-gray-900">{data.fullDate}</p>
          <p className="text-blue-600">
            Puissance max: <span className="font-bold">{data.puissance.toFixed(2)} kW</span>
          </p>
          {data.time && (
            <p className="text-gray-600 text-sm">
              Heure du pic: {data.time}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Pic Maximum</div>
          <div className="text-2xl font-bold text-blue-900">{maxPower.toFixed(2)} kW</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Moyenne</div>
          <div className="text-2xl font-bold text-green-900">{avgPower.toFixed(2)} kW</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Période</div>
          <div className="text-2xl font-bold text-purple-900">{data.length} jours</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            interval={Math.floor(chartData.length / 12)}
          />
          <YAxis
            label={{ value: 'Puissance (kW)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine
            y={maxPower}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `Pic: ${maxPower.toFixed(2)} kW`,
              position: 'right',
              fill: '#ef4444',
              fontSize: 12,
              fontWeight: 'bold'
            }}
          />
          <Line
            type="monotone"
            dataKey="puissance"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
            name="Puissance max (kW)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MaxPowerChart;
