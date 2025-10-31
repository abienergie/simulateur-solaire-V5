import React from 'react';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, ReferenceLine, PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';

interface ConsumptionData {
  date: string;
  peak_hours: number;
  off_peak_hours: number;
  total: number;
}

interface MaxPowerData {
  date: string;
  max_power: number;
}

interface AnnualConsumptionChartProps {
  data: ConsumptionData[];
  maxPowerData?: MaxPowerData[];
  loadCurveData?: any[];
  loading: boolean;
  error: string | null;
  title?: string;
  hpHcTotals?: any;
  hpHcMonthly?: any[];
  hpHcWeekly?: any[];
  dataType?: 'consumption' | 'production';
}

// Couleurs pour le camembert
const PIE_COLORS = ['#3B82F6', '#10B981']; // Bleu et vert

const AnnualConsumptionChart: React.FC<AnnualConsumptionChartProps> = ({
  data,
  maxPowerData = [],
  loadCurveData = [],
  loading,
  error,
  title = "Consommation quotidienne sur l'année (kWh)",
  hpHcTotals,
  hpHcMonthly = [],
  hpHcWeekly = [],
  dataType = 'consumption'
}) => {

  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [monthlyDebugClickCount, setMonthlyDebugClickCount] = useState(0);
  const [showMonthlyDebug, setShowMonthlyDebug] = useState(false);
  const [weeklyDebugClickCount, setWeeklyDebugClickCount] = useState(0);
  const [showWeeklyDebug, setShowWeeklyDebug] = useState(false);

  // Labels dynamiques selon le type de données
  const labels = dataType === 'production' ? {
    totalLabel: 'Production totale',
    avgLabel: 'Production moyenne',
    maxLabel: 'Production maximale',
    chartTitle: "Production quotidienne sur l'année (kWh)",
    noDataMsg: 'Aucune donnée de production disponible',
    dataMsg: 'Données de production quotidienne sur',
    legendLabel: 'Production totale'
  } : {
    totalLabel: 'Consommation totale',
    avgLabel: 'Consommation moyenne',
    maxLabel: 'Consommation maximale',
    chartTitle: "Consommation quotidienne sur l'année (kWh)",
    noDataMsg: 'Aucune donnée de consommation disponible',
    dataMsg: 'Données de consommation quotidienne sur',
    legendLabel: 'Consommation totale'
  };

  // Si pas de données, afficher un message
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title}
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500">{labels.noDataMsg}</p>
        </div>
      </div>
    );
  }

  // Calculer les statistiques de consommation
  const totalConsumption = data.reduce((sum, item) => sum + (item.total || (item.peak_hours + item.off_peak_hours)), 0);
  const averageDaily = totalConsumption / data.length;
  const maxDaily = Math.max(...data.map(item => item.total || (item.peak_hours + item.off_peak_hours)));

  // Calculer les totaux HC/HP pour le camembert
  // Utiliser les données réelles de la courbe de charge si disponibles
  let totalPeakHours, totalOffPeakHours, peakPercentage, offPeakPercentage;
  
  // SOLUTION CORRIGÉE : Priorité aux vues Supabase, puis courbe de charge
  
  // 1. Essayer d'abord les vues Supabase (données pré-calculées correctes)
  if (hpHcTotals && hpHcTotals.total_kwh > 0) {
    console.log('🎯 Utilisation des vues Supabase pour HC/HP (données correctes)');
    totalPeakHours = hpHcTotals.hp_kwh;
    totalOffPeakHours = hpHcTotals.hc_kwh;
    
    const total = hpHcTotals.total_kwh;
    peakPercentage = (totalPeakHours / total) * 100;
    offPeakPercentage = (totalOffPeakHours / total) * 100;
  }
  // 2. Utiliser les données mensuelles Supabase pour les graphiques mensuels
  else if (hpHcMonthly && hpHcMonthly.length > 0) {
    console.log('🎯 Utilisation des vues mensuelles Supabase pour HC/HP');
    totalPeakHours = hpHcMonthly.reduce((sum, month) => sum + month.hp_kwh, 0);
    totalOffPeakHours = hpHcMonthly.reduce((sum, month) => sum + month.hc_kwh, 0);
    
    const total = totalPeakHours + totalOffPeakHours;
    peakPercentage = total > 0 ? (totalPeakHours / total) * 100 : 0;
    offPeakPercentage = total > 0 ? (totalOffPeakHours / total) * 100 : 0;
  }
  // 3. Sinon, calculer depuis la courbe de charge si disponible
  else if (loadCurveData && loadCurveData.length > 0) {
    console.log('🔄 Calcul HC/HP depuis courbe de charge');
    console.log('📊 Points disponibles:', loadCurveData.length);
    
    // Calculer HC/HP depuis la courbe de charge avec protection
    let loadCurvePeakConsumption = 0;
    let loadCurveOffPeakConsumption = 0;
    let validPoints = 0;
    
    // Traiter par petits lots pour éviter les blocages
    const batchSize = 1000;
    for (let i = 0; i < loadCurveData.length; i += batchSize) {
      const batch = loadCurveData.slice(i, i + batchSize);
      
      batch.forEach(point => {
        // Vérifications de sécurité
        if (point && 
            typeof point.value === 'number' && 
            !isNaN(point.value) && 
            point.value >= 0 &&
            typeof point.is_off_peak === 'boolean') {
          
          // Convertir kW en kWh (30min = 0.5h)
          const energyKwh = point.value * 0.5;
          
          if (point.is_off_peak) {
            loadCurveOffPeakConsumption += energyKwh;
          } else {
            loadCurvePeakConsumption += energyKwh;
          }
          validPoints++;
        }
      });
    }
    
    const loadCurveTotal = loadCurvePeakConsumption + loadCurveOffPeakConsumption;
    
    console.log('🎯 RÉSULTAT HC/HP depuis courbe de charge:', {
      totalHP_kWh: loadCurvePeakConsumption.toFixed(2),
      totalHC_kWh: loadCurveOffPeakConsumption.toFixed(2),
      totalCourbe_kWh: loadCurveTotal.toFixed(2),
      pointsValides: validPoints,
      pointsTotal: loadCurveData.length
    });
    
    // Vérifier que les données sont cohérentes
    if (loadCurveTotal > 0 && validPoints > 0) {
      // Utiliser les données de la courbe de charge
      totalPeakHours = loadCurvePeakConsumption;
      totalOffPeakHours = loadCurveOffPeakConsumption;
      
      peakPercentage = (loadCurvePeakConsumption / loadCurveTotal) * 100;
      offPeakPercentage = (loadCurveOffPeakConsumption / loadCurveTotal) * 100;
      
      console.log('✅ HC/HP calculés depuis courbe de charge:', {
        peakPercentage: peakPercentage.toFixed(2) + '%',
        offPeakPercentage: offPeakPercentage.toFixed(2) + '%'
      });
    } else {
      console.warn('⚠️ Données de courbe de charge invalides, utilisation du fallback');
      // Fallback sur les données R65 si la courbe de charge est invalide
      totalPeakHours = data.reduce((sum, item) => sum + item.peak_hours, 0);
      totalOffPeakHours = data.reduce((sum, item) => sum + item.off_peak_hours, 0);
      
      const total = totalPeakHours + totalOffPeakHours;
      peakPercentage = total > 0 ? (totalPeakHours / total) * 100 : 0;
      offPeakPercentage = total > 0 ? (totalOffPeakHours / total) * 100 : 0;
    }
  }
  // 4. Fallback : utiliser directement les données R65 HP/HC
  else {
    console.log('⬇️ Fallback : utilisation des données R65 pour HC/HP');
    totalPeakHours = data.reduce((sum, item) => sum + item.peak_hours, 0);
    totalOffPeakHours = data.reduce((sum, item) => sum + item.off_peak_hours, 0);
    
    const total = totalPeakHours + totalOffPeakHours;
    peakPercentage = total > 0 ? (totalPeakHours / total) * 100 : 0;
    offPeakPercentage = total > 0 ? (totalOffPeakHours / total) * 100 : 0;
  }

  // Données pour le camembert
  const pieData = [
    { name: 'Heures Pleines', value: totalPeakHours, percentage: peakPercentage },
    { name: 'Heures Creuses', value: totalOffPeakHours, percentage: offPeakPercentage }
  ];

  // Fonction pour afficher ou masquer le debug
  const handleDebugClick = () => {
    const newCount = debugClickCount + 1;
    setDebugClickCount(newCount);
    
    if (newCount >= 7) {
      setShowDebug(!showDebug);
      setDebugClickCount(0);
    }
  };

  const handleMonthlyDebugClick = () => {
    const newCount = monthlyDebugClickCount + 1;
    setMonthlyDebugClickCount(newCount);
    
    if (newCount >= 7) {
      setShowMonthlyDebug(!showMonthlyDebug);
      setMonthlyDebugClickCount(0);
    }
  };

  const handleWeeklyDebugClick = () => {
    const newCount = weeklyDebugClickCount + 1;
    setWeeklyDebugClickCount(newCount);
    
    if (newCount >= 7) {
      setShowWeeklyDebug(!showWeeklyDebug);
      setWeeklyDebugClickCount(0);
    }
  };

  // Préparer les données mensuelles pour le graphique
  const prepareMonthlyData = () => {
    if (hpHcMonthly && hpHcMonthly.length > 0) {
      console.log('📊 Utilisation des vues mensuelles Supabase');
      return hpHcMonthly.map(month => ({
        month: new Date(month.year, month.month - 1).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' }),
        hp_kwh: month.hp_kwh,
        hc_kwh: month.hc_kwh,
        total_kwh: month.total_kwh
      }));
    }

    // Fallback : calculer depuis les données quotidiennes
    console.log('📊 Calcul des données mensuelles depuis données quotidiennes');
    const monthlyMap = new Map();

    data.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' }),
          hp_kwh: 0,
          hc_kwh: 0,
          total_kwh: 0
        });
      }
      
      const monthData = monthlyMap.get(monthKey);
      monthData.hp_kwh += item.peak_hours || 0;
      monthData.hc_kwh += item.off_peak_hours || 0;
      monthData.total_kwh += (item.total || (item.peak_hours + item.off_peak_hours));
    });

    return Array.from(monthlyMap.values()).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Préparer les données hebdomadaires pour le graphique
  const prepareWeeklyData = () => {
    if (hpHcWeekly && hpHcWeekly.length > 0) {
      console.log('📊 Utilisation des vues hebdomadaires Supabase');
      return hpHcWeekly.map(week => ({
        week: `S${week.week_number}`,
        hp_kwh: week.hp_kwh,
        hc_kwh: week.hc_kwh,
        total_kwh: week.total_kwh,
        year: week.year,
        weekNumber: week.week_number
      }));
    }

    // Fallback : calculer depuis les données quotidiennes
    console.log('📊 Calcul des données hebdomadaires depuis données quotidiennes');
    const weeklyMap = new Map();

    data.forEach(item => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      
      // Calculer le numéro de semaine ISO
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      
      const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;
      
      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: `S${weekNumber}`,
          hp_kwh: 0,
          hc_kwh: 0,
          total_kwh: 0,
          year: year,
          weekNumber: weekNumber
        });
      }
      
      const weekData = weeklyMap.get(weekKey);
      weekData.hp_kwh += item.peak_hours || 0;
      weekData.hc_kwh += item.off_peak_hours || 0;
      weekData.total_kwh += (item.total || (item.peak_hours + item.off_peak_hours));
    });

    return Array.from(weeklyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.weekNumber - b.weekNumber;
    });
  };

  const monthlyData = prepareMonthlyData();
  const weeklyData = prepareWeeklyData();

  // Fonction pour afficher la vue sélectionnée
  const renderView = () => {
    if (viewMode === 'monthly') {
      return (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  padding: '8px 12px'
                }}
              />
              <Legend />
              <Bar dataKey="hp_kwh" name="Heures Pleines" stackId="a" fill="#3B82F6" />
              <Bar dataKey="hc_kwh" name="Heures Creuses" stackId="a" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    } else {
      return (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyData}
              margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="week"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
                interval={Math.floor(weeklyData.length / 20)}
              />
              <YAxis
                label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  padding: '8px 12px'
                }}
              />
              <Legend />
              <Bar dataKey="hp_kwh" name="Heures Pleines" stackId="a" fill="#3B82F6" />
              <Bar dataKey="hc_kwh" name="Heures Creuses" stackId="a" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
  };
    
  return (
    <div className="space-y-8">
      {/* 1er GRAPHIQUE : Consommation quotidienne */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {labels.chartTitle}
        </h3>

        {/* Statistiques résumées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">{labels.totalLabel}</p>
            <p className="text-2xl font-bold text-blue-700">{Math.round(totalConsumption).toLocaleString()} kWh</p>
            <p className="text-xs text-blue-500 mt-1">Sur {data.length} jours</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">{labels.avgLabel}</p>
            <p className="text-2xl font-bold text-green-700">
              {averageDaily.toFixed(2)} kWh/jour
            </p>
            <p className="text-xs text-green-500 mt-1">Moyenne quotidienne</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">{labels.maxLabel}</p>
            <p className="text-2xl font-bold text-purple-700">
              {maxDaily.toFixed(2)} kWh
            </p>
            <p className="text-xs text-purple-500 mt-1">Pic journalier</p>
          </div>
        </div>

        {/* Graphique de consommation totale - bleu ciel clair */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.map(item => ({
                date: item.date,
                total: item.total || (item.peak_hours + item.off_peak_hours)
              }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date"
                tickFormatter={(dateStr) => {
                  const date = new Date(dateStr);
                  return date.toLocaleDateString('fr-FR', { 
                    day: '2-digit', 
                    month: 'short' 
                  });
                }}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 12 }}
                interval={Math.floor(data.length / 12)}
              />
              <YAxis 
                label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(2) : 'N/A'} kWh`, labels.legendLabel]}
                labelFormatter={(label: string) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  });
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
                name={labels.legendLabel}
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.2}
                strokeWidth={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-sm text-gray-500 text-center">
          {labels.dataMsg} {data.length} jours
        </div>
      </div>

      {/* 2ème GRAPHIQUE : Répartition HP/HC avec camembert */}
      {(totalPeakHours > 0 || totalOffPeakHours > 0) && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 
            className="text-lg font-semibold text-gray-900 mb-4 cursor-pointer select-none"
            onClick={handleDebugClick}
            title="Cliquez 7 fois pour afficher le mode debug"
          >
            Répartition Heures Pleines / Heures Creuses
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Camembert */}
            <div className="flex flex-col items-center">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => `${typeof value === 'number' ? value.toFixed(2) : 'N/A'} kWh`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        padding: '8px 12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Statistiques HP/HC */}
              <div className="grid grid-cols-2 gap-4 w-full mt-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Heures Pleines</p>
                  <p className="text-2xl font-bold text-blue-700">{Math.round(totalPeakHours).toLocaleString()} kWh</p>
                  <p className="text-xs text-blue-500 mt-1">{peakPercentage.toFixed(1)}%</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Heures Creuses</p>
                  <p className="text-2xl font-bold text-green-700">{Math.round(totalOffPeakHours).toLocaleString()} kWh</p>
                  <p className="text-xs text-green-500 mt-1">{offPeakPercentage.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Graphique en aires empilées */}
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date"
                    tickFormatter={(dateStr) => {
                      const date = new Date(dateStr);
                      return date.toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: 'short' 
                      });
                    }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                    interval={Math.floor(data.length / 12)}
                  />
                  <YAxis 
                    label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => `${typeof value === 'number' ? value.toFixed(2) : 'N/A'} kWh`}
                    labelFormatter={(label: string) => {
                      const date = new Date(label);
                      return date.toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: 'long',
                        year: 'numeric'
                      });
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
                    dataKey="peak_hours" 
                    stackId="1"
                    name="Heures Pleines"
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.8}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="off_peak_hours" 
                    stackId="1"
                    name="Heures Creuses"
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section DEBUG - Affichée seulement après 7 clics */}
          {showDebug && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-yellow-400">🔍 MODE DEBUG - Sources de données HC/HP</h4>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-700"
                >
                  Fermer
                </button>
              </div>
              <div className="space-y-2 text-xs text-gray-300 font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-400 font-bold mb-1">Vue Supabase (totaux):</p>
                    <p>Disponible: {hpHcTotals && hpHcTotals.total_kwh > 0 ? '✅ OUI' : '❌ NON'}</p>
                    {hpHcTotals && hpHcTotals.total_kwh > 0 && (
                      <>
                        <p>HP: {hpHcTotals.hp_kwh.toFixed(2)} kWh</p>
                        <p>HC: {hpHcTotals.hc_kwh.toFixed(2)} kWh</p>
                        <p>Total: {hpHcTotals.total_kwh.toFixed(2)} kWh</p>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-green-400 font-bold mb-1">Vue Supabase (mensuel):</p>
                    <p>Disponible: {hpHcMonthly && hpHcMonthly.length > 0 ? '✅ OUI' : '❌ NON'}</p>
                    {hpHcMonthly && hpHcMonthly.length > 0 && (
                      <>
                        <p>Mois: {hpHcMonthly.length}</p>
                        <p>Total HP: {hpHcMonthly.reduce((sum, m) => sum + m.hp_kwh, 0).toFixed(2)} kWh</p>
                        <p>Total HC: {hpHcMonthly.reduce((sum, m) => sum + m.hc_kwh, 0).toFixed(2)} kWh</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <p className="text-purple-400 font-bold mb-1">Courbe de charge:</p>
                  <p>Points disponibles: {loadCurveData?.length || 0}</p>
                  {loadCurveData && loadCurveData.length > 0 && (
                    <>
                      <p>Premier point: {JSON.stringify(loadCurveData[0])}</p>
                      <p>Type: {typeof loadCurveData[0]?.value} | is_off_peak: {typeof loadCurveData[0]?.is_off_peak}</p>
                    </>
                  )}
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <p className="text-yellow-400 font-bold mb-1">Données R65 (fallback):</p>
                  <p>Jours: {data.length}</p>
                  <p>HP total: {data.reduce((sum, item) => sum + item.peak_hours, 0).toFixed(2)} kWh</p>
                  <p>HC total: {data.reduce((sum, item) => sum + item.off_peak_hours, 0).toFixed(2)} kWh</p>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <p className="text-green-400 font-bold mb-1">✨ Source utilisée:</p>
                  <p className="text-white font-bold">
                    {hpHcTotals && hpHcTotals.total_kwh > 0 
                      ? '📊 Vue Supabase (totaux) - DONNÉES CORRECTES'
                      : hpHcMonthly && hpHcMonthly.length > 0
                      ? '📊 Vue Supabase (mensuel) - DONNÉES CORRECTES'
                      : loadCurveData && loadCurveData.length > 0
                      ? '📈 Courbe de charge'
                      : '📅 Données R65 (fallback)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3ème GRAPHIQUE : Vue mensuelle ou hebdomadaire */}
      {(monthlyData.length > 0 || weeklyData.length > 0) && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="text-lg font-semibold text-gray-900 cursor-pointer select-none"
              onClick={viewMode === 'monthly' ? handleMonthlyDebugClick : handleWeeklyDebugClick}
              title="Cliquez 7 fois pour afficher le mode debug"
            >
              Consommation {viewMode === 'monthly' ? 'mensuelle' : 'hebdomadaire'} (HP/HC)
            </h3>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Vue mensuelle
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Vue hebdomadaire
              </button>
            </div>
          </div>

          {renderView()}

          {/* Section DEBUG MENSUEL */}
          {showMonthlyDebug && viewMode === 'monthly' && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-yellow-400">🔍 MODE DEBUG - Données mensuelles</h4>
                <button
                  onClick={() => setShowMonthlyDebug(false)}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-700"
                >
                  Fermer
                </button>
              </div>
              <div className="space-y-2 text-xs text-gray-300 font-mono">
                <p className="text-blue-400 font-bold">Source: {hpHcMonthly && hpHcMonthly.length > 0 ? '📊 Vue Supabase' : '📅 Calculé depuis données quotidiennes'}</p>
                <p>Nombre de mois: {monthlyData.length}</p>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <p className="text-green-400 font-bold mb-1">Aperçu des données:</p>
                  <pre className="text-white bg-gray-900 p-2 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(monthlyData.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Section DEBUG HEBDOMADAIRE */}
          {showWeeklyDebug && viewMode === 'weekly' && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-yellow-400">🔍 MODE DEBUG - Données hebdomadaires</h4>
                <button
                  onClick={() => setShowWeeklyDebug(false)}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-700"
                >
                  Fermer
                </button>
              </div>
              <div className="space-y-2 text-xs text-gray-300 font-mono">
                <p className="text-blue-400 font-bold">Source: {hpHcWeekly && hpHcWeekly.length > 0 ? '📊 Vue Supabase' : '📅 Calculé depuis données quotidiennes'}</p>
                <p>Nombre de semaines: {weeklyData.length}</p>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <p className="text-green-400 font-bold mb-1">Aperçu des données:</p>
                  <pre className="text-white bg-gray-900 p-2 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(weeklyData.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnualConsumptionChart;
