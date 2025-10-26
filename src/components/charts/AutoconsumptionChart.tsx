import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, BarChart3 } from 'lucide-react';

interface AutoconsumptionDataPoint {
  timestamp: string;
  consumption: number;
  production: number;
  autoconsumption: number;
  surplus: number;
  gridImport: number;
}

interface AutoconsumptionChartProps {
  data: AutoconsumptionDataPoint[];
  title?: string;
}

const AutoconsumptionChart: React.FC<AutoconsumptionChartProps> = ({
  data,
  title = "Croisement Consommation / Production"
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'year'>('week');

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">Aucune donnée disponible</p>
      </div>
    );
  }

  // Prendre les 7 premiers jours pour une visualisation claire
  const displayData = data.slice(0, 336).map((point, index) => ({
    ...point,
    index,
    displayDate: format(parseISO(point.timestamp), 'dd/MM HH:mm', { locale: fr })
  }));

  // Agréger les données par mois pour la vue annuelle
  const monthlyData = React.useMemo(() => {
    const monthlyMap = new Map<string, {
      consumption: number;
      production: number;
      autoconsumption: number;
      surplus: number;
      gridImport: number;
      count: number;
    }>();

    data.forEach(point => {
      const monthKey = format(parseISO(point.timestamp), 'yyyy-MM');
      const existing = monthlyMap.get(monthKey) || {
        consumption: 0,
        production: 0,
        autoconsumption: 0,
        surplus: 0,
        gridImport: 0,
        count: 0
      };

      monthlyMap.set(monthKey, {
        consumption: existing.consumption + point.consumption,
        production: existing.production + point.production,
        autoconsumption: existing.autoconsumption + point.autoconsumption,
        surplus: existing.surplus + point.surplus,
        gridImport: existing.gridImport + point.gridImport,
        count: existing.count + 1
      });
    });

    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, values]) => ({
        month: format(parseISO(month + '-01'), 'MMM', { locale: fr }),
        fullMonth: format(parseISO(month + '-01'), 'MMMM', { locale: fr }),
        consumption: Math.round(values.consumption),
        production: Math.round(values.production),
        autoconsumption: Math.round(values.autoconsumption),
        surplus: Math.round(values.surplus),
        gridImport: Math.round(values.gridImport)
      }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900 mb-2">{data.displayDate}</p>
          <p className="text-sm text-blue-600">Consommation: {data.consumption.toFixed(2)} kW</p>
          <p className="text-sm text-yellow-600">Production: {data.production.toFixed(2)} kW</p>
          <p className="text-sm text-green-600 font-semibold">Autoconso: {data.autoconsumption.toFixed(2)} kW</p>
          <p className="text-sm text-orange-500">Surplus: {data.surplus.toFixed(2)} kW</p>
          <p className="text-sm text-red-500">Soutirage: {data.gridImport.toFixed(2)} kW</p>
        </div>
      );
    }
    return null;
  };

  const formatXAxis = (index: number) => {
    if (index % 48 === 0) {
      const point = displayData[index];
      if (point) {
        return format(parseISO(point.timestamp), 'dd/MM', { locale: fr });
      }
    }
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">
            {viewMode === 'week' ? 'Visualisation des flux énergétiques (7 premiers jours)' : 'Vue annuelle schématique'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            7 jours
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              viewMode === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Année
          </button>
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'week' ? (
            <AreaChart
              data={displayData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="index"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 11 }}
                label={{ value: 'Temps', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{ value: 'Puissance (kW)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />

              <Area
                type="monotone"
                dataKey="consumption"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
                name="Consommation"
              />
              <Area
                type="monotone"
                dataKey="production"
                stackId="2"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.3}
                name="Production"
              />
              <Area
                type="monotone"
                dataKey="autoconsumption"
                stackId="3"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
                name="Autoconsommation"
              />
            </AreaChart>
          ) : (
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                label={{ value: 'Énergie (kWh)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                        <p className="text-sm font-semibold text-gray-900 mb-2 capitalize">{data.fullMonth}</p>
                        <p className="text-sm text-blue-600">Consommation: {data.consumption} kWh</p>
                        <p className="text-sm text-red-600 font-semibold">Production autoconsommée: {data.autoconsumption} kWh</p>
                        <p className="text-sm text-orange-600">Surplus: {data.surplus} kWh</p>
                        <p className="text-sm text-gray-700 font-semibold border-t mt-1 pt-1">Production totale: {data.production} kWh</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                payload={[
                  { value: "Consommation d'électricité", type: 'rect', color: '#3B82F6' },
                  { value: 'Surplus', type: 'rect', color: '#F59E0B' },
                  { value: 'Production autoconsommée', type: 'rect', color: '#EF4444' }
                ]}
              />

              <Bar
                dataKey="consumption"
                fill="#3B82F6"
                name="Consommation d'électricité"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="surplus"
                fill="#F59E0B"
                name="Surplus"
                radius={[4, 4, 0, 0]}
                stackId="production"
              />
              <Bar
                dataKey="autoconsumption"
                fill="#EF4444"
                name="Production autoconsommée"
                radius={[4, 4, 0, 0]}
                stackId="production"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {viewMode === 'week' ? (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="bg-blue-50 rounded p-3 border border-blue-200">
            <div className="font-semibold text-blue-700">Consommation</div>
            <div className="text-gray-700 mt-1">Besoins du foyer</div>
          </div>
          <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
            <div className="font-semibold text-yellow-700">Production</div>
            <div className="text-gray-700 mt-1">Énergie solaire</div>
          </div>
          <div className="bg-green-50 rounded p-3 border border-green-200">
            <div className="font-semibold text-green-700">Autoconso</div>
            <div className="text-gray-700 mt-1">Production utilisée</div>
          </div>
          <div className="bg-orange-50 rounded p-3 border border-orange-200">
            <div className="font-semibold text-orange-700">Surplus</div>
            <div className="text-gray-700 mt-1">Injecté au réseau</div>
          </div>
          <div className="bg-red-50 rounded p-3 border border-red-200">
            <div className="font-semibold text-red-700">Soutirage</div>
            <div className="text-gray-700 mt-1">Acheté au réseau</div>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-blue-50 rounded p-3 border border-blue-200">
            <div className="font-semibold text-blue-700">Consommation d'électricité</div>
            <div className="text-gray-700 mt-1">Besoins totaux du foyer sur le mois</div>
          </div>
          <div className="bg-red-50 rounded p-3 border border-red-200">
            <div className="font-semibold text-red-700">Production autoconsommée</div>
            <div className="text-gray-700 mt-1">Part de la production utilisée directement</div>
          </div>
          <div className="bg-orange-50 rounded p-3 border border-orange-200">
            <div className="font-semibold text-orange-700">Surplus</div>
            <div className="text-gray-700 mt-1">Énergie injectée sur le réseau</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoconsumptionChart;
