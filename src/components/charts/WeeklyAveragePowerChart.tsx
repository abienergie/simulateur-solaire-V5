import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, getDay, getHours, getMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LoadCurveDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

interface WeeklyAveragePowerChartProps {
  data: LoadCurveDataPoint[];
  title?: string;
}

const WeeklyAveragePowerChart: React.FC<WeeklyAveragePowerChartProps> = ({
  data,
  title = "Courbe de puissances journalière moyenne"
}) => {
  // Noms des jours de la semaine
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  // État pour la sélection des jours
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>(
    dayNames.reduce((acc, day) => ({ ...acc, [day]: true }), {})
  );

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">Aucune donnée disponible pour afficher le graphique</p>
      </div>
    );
  }

  // Fonction pour tout sélectionner/désélectionner
  const toggleAll = () => {
    const allSelected = Object.values(selectedDays).every(v => v);
    const newState = dayNames.reduce((acc, day) => ({ ...acc, [day]: !allSelected }), {});
    setSelectedDays(newState);
  };

  // Fonction pour toggle un jour spécifique
  const toggleDay = (dayName: string) => {
    setSelectedDays(prev => ({ ...prev, [dayName]: !prev[dayName] }));
  };

  // Couleurs pour chaque jour (basées sur l'image exemple)
  const dayColors = [
    '#DAA520', // Dimanche - Gold
    '#FF6347', // Lundi - Tomato
    '#FF69B4', // Mardi - HotPink
    '#4169E1', // Mercredi - RoyalBlue
    '#87CEEB', // Jeudi - SkyBlue
    '#32CD32', // Vendredi - LimeGreen
    '#FFA500', // Samedi - Orange
  ];

  // Grouper les données par jour de la semaine et par heure
  const groupedByDayAndTime = data.reduce((acc, point) => {
    const date = parseISO(point.timestamp);
    const dayOfWeek = getDay(date); // 0 = Dimanche, 1 = Lundi, etc.
    const hours = getHours(date);
    const minutes = getMinutes(date);
    const timeKey = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    if (!acc[dayOfWeek]) {
      acc[dayOfWeek] = {};
    }

    if (!acc[dayOfWeek][timeKey]) {
      acc[dayOfWeek][timeKey] = {
        sum: 0,
        count: 0
      };
    }

    acc[dayOfWeek][timeKey].sum += parseFloat(point.value.toString());
    acc[dayOfWeek][timeKey].count += 1;

    return acc;
  }, {} as Record<number, Record<string, { sum: number; count: number }>>);

  // Créer une liste de toutes les heures de la journée (de 00:00 à 23:30 par pas de 30min)
  const timeSlots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  // Calculer les moyennes pour chaque jour et chaque créneau horaire
  const chartData = timeSlots.map(timeKey => {
    const dataPoint: any = { time: timeKey };

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayName = dayNames[dayOfWeek];
      const dayData = groupedByDayAndTime[dayOfWeek];

      if (dayData && dayData[timeKey]) {
        const avg = dayData[timeKey].sum / dayData[timeKey].count;
        dataPoint[dayName] = parseFloat(avg.toFixed(2));
      } else {
        dataPoint[dayName] = null;
      }
    }

    return dataPoint;
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-900 mb-2">Heure: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value ? `${entry.value.toFixed(2)} kW` : 'N/A'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Formatter pour l'axe X (afficher seulement certaines heures)
  const formatXAxis = (tickItem: string) => {
    const [hours] = tickItem.split(':');
    if (tickItem.endsWith(':00')) {
      return `${hours}:00`;
    }
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">
          Comparaison des profils de consommation moyens pour chaque jour de la semaine sur 24 heures
        </p>

        {/* Sélecteur de jours */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Sélection des jours :</span>
            <button
              onClick={toggleAll}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {Object.values(selectedDays).every(v => v) ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((dayName, index) => (
              <label
                key={dayName}
                className="flex items-center justify-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDays[dayName]}
                  onChange={() => toggleDay(dayName)}
                  className="mr-1.5 h-4 w-4 cursor-pointer"
                  style={{ accentColor: dayColors[index] }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: selectedDays[dayName] ? dayColors[index] : '#9ca3af' }}
                >
                  {dayName.substring(0, 3)}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="time"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 11 }}
              interval={1}
              label={{ value: 'Heure', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'kW', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />

            {dayNames.map((dayName, index) => (
              selectedDays[dayName] && (
                <Line
                  key={dayName}
                  type="monotone"
                  dataKey={dayName}
                  stroke={dayColors[index]}
                  strokeWidth={2}
                  dot={false}
                  name={dayName}
                  connectNulls
                  isAnimationActive={false}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-2 text-xs">
        {dayNames.map((dayName, index) => {
          // Calculer la consommation moyenne pour ce jour
          const dayValues = chartData
            .map(d => d[dayName])
            .filter(v => v !== null) as number[];

          const avgDay = dayValues.length > 0
            ? dayValues.reduce((a, b) => a + b, 0) / dayValues.length
            : 0;

          return (
            <div
              key={dayName}
              className="bg-gray-50 rounded p-2 text-center border"
              style={{ borderColor: dayColors[index] }}
            >
              <div
                className="font-semibold mb-1"
                style={{ color: dayColors[index] }}
              >
                {dayName}
              </div>
              <div className="text-gray-700">
                {avgDay.toFixed(1)} kW
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyAveragePowerChart;
