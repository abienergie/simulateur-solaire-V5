import React, { useMemo } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { FileText, Zap, Clock, AlertTriangle } from 'lucide-react';

interface LoadCurvePoint {
  prm: string;
  date: string;
  time: string;
  date_time: string;
  value: number;
  is_off_peak: boolean;
}

interface ContractDetectionChartProps {
  data: LoadCurvePoint[];
  title?: string;
}

const ContractDetectionChart: React.FC<ContractDetectionChartProps> = ({ 
  data, 
  title = "Détection du contrat - Analyse des quadrants" 
}) => {
  // Analyser les données pour détecter le type de contrat
  const contractAnalysis = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Grouper par heure pour analyser les patterns
    const hourlyData = data.reduce((acc, point) => {
      const hour = new Date(point.date_time).getHours();
      if (!acc[hour]) {
        acc[hour] = {
          hour,
          values: [],
          offPeakCount: 0,
          totalCount: 0
        };
      }
      
      acc[hour].values.push(point.value);
      acc[hour].totalCount += 1;
      if (point.is_off_peak) {
        acc[hour].offPeakCount += 1;
      }
      
      return acc;
    }, {} as Record<number, any>);

    // Calculer les moyennes par heure
    const hourlyAverages = Object.values(hourlyData).map((hourData: any) => {
      const avgPower = hourData.values.reduce((sum: number, val: number) => sum + val, 0) / hourData.values.length;
      const maxPower = Math.max(...hourData.values);
      const isOffPeakHour = hourData.offPeakCount > (hourData.totalCount / 2);
      
      return {
        hour: hourData.hour,
        timeLabel: `${hourData.hour.toString().padStart(2, '0')}:00`,
        avgPower,
        maxPower,
        isOffPeak: isOffPeakHour,
        dataPoints: hourData.totalCount
      };
    }).sort((a, b) => a.hour - b.hour);

    // Détecter le type de contrat basé sur les heures creuses
    const offPeakHours = hourlyAverages.filter(h => h.isOffPeak).map(h => h.hour);
    
    let contractType = 'Base';
    let offPeakPeriods: string[] = [];
    
    if (offPeakHours.length > 0) {
      // Analyser les patterns d'heures creuses
      const sortedOffPeak = [...offPeakHours].sort((a, b) => a - b);
      
      // Détecter les périodes continues
      const periods: number[][] = [];
      let currentPeriod: number[] = [sortedOffPeak[0]];
      
      for (let i = 1; i < sortedOffPeak.length; i++) {
        if (sortedOffPeak[i] === sortedOffPeak[i-1] + 1) {
          currentPeriod.push(sortedOffPeak[i]);
        } else {
          periods.push(currentPeriod);
          currentPeriod = [sortedOffPeak[i]];
        }
      }
      periods.push(currentPeriod);
      
      // Formater les périodes
      offPeakPeriods = periods.map(period => {
        if (period.length === 1) {
          return `${period[0]}h`;
        } else {
          return `${period[0]}h-${period[period.length - 1] + 1}h`;
        }
      });
      
      // Détecter le type de contrat
      if (offPeakHours.length >= 8) {
        contractType = 'Heures Creuses';
      } else if (offPeakHours.length >= 4) {
        contractType = 'Tempo ou EJP';
      }
    }

    // Calculer les quadrants de consommation
    const avgConsumption = hourlyAverages.reduce((sum, h) => sum + h.avgPower, 0) / hourlyAverages.length;
    const maxConsumption = Math.max(...hourlyAverages.map(h => h.maxPower));
    
    const quadrants = hourlyAverages.map(hourData => {
      // Quadrant basé sur heure (jour/nuit) et puissance (faible/forte)
      const isNight = hourData.hour >= 22 || hourData.hour <= 6;
      const isHighPower = hourData.avgPower > avgConsumption;
      
      let quadrant = '';
      let color = '';
      
      if (isNight && !isHighPower) {
        quadrant = 'Q1: Nuit - Faible';
        color = '#10B981'; // Vert
      } else if (!isNight && !isHighPower) {
        quadrant = 'Q2: Jour - Faible';
        color = '#3B82F6'; // Bleu
      } else if (!isNight && isHighPower) {
        quadrant = 'Q3: Jour - Forte';
        color = '#F59E0B'; // Orange
      } else {
        quadrant = 'Q4: Nuit - Forte';
        color = '#EF4444'; // Rouge
      }
      
      return {
        ...hourData,
        quadrant,
        color,
        isNight,
        isHighPower
      };
    });

    return {
      contractType,
      offPeakPeriods,
      hourlyAverages,
      quadrants,
      avgConsumption,
      maxConsumption,
      totalOffPeakHours: offPeakHours.length
    };
  }, [data]);

  if (!contractAnalysis) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucune donnée disponible pour l'analyse du contrat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      
      {/* Informations sur le contrat détecté */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <p className="text-sm text-blue-600 font-medium">Type de contrat détecté</p>
          </div>
          <p className="text-xl font-bold text-blue-700">{contractAnalysis.contractType}</p>
          <p className="text-xs text-blue-500 mt-1">
            Basé sur l'analyse des heures creuses
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-600 font-medium">Heures creuses</p>
          </div>
          <p className="text-lg font-bold text-green-700">
            {contractAnalysis.totalOffPeakHours}h/jour
          </p>
          <p className="text-xs text-green-500 mt-1">
            {contractAnalysis.offPeakPeriods.join(', ') || 'Aucune détectée'}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-purple-500" />
            <p className="text-sm text-purple-600 font-medium">Puissance moyenne</p>
          </div>
          <p className="text-xl font-bold text-purple-700">
            {contractAnalysis.avgConsumption.toFixed(2)} kW
          </p>
          <p className="text-xs text-purple-500 mt-1">
            Max: {contractAnalysis.maxConsumption.toFixed(2)} kW
          </p>
        </div>
      </div>

      {/* Graphique des quadrants */}
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            data={contractAnalysis.quadrants}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour"
              type="number"
              domain={[0, 23]}
              label={{ value: 'Heure de la journée', position: 'insideBottom', offset: -10 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              dataKey="avgPower"
              type="number"
              label={{ value: 'Puissance moyenne (kW)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => {
                const point = props.payload;
                if (name === 'avgPower') {
                  return [
                    `${value.toFixed(3)} kW`, 
                    `${point.timeLabel} - ${point.quadrant}`
                  ];
                }
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  const point = payload[0].payload;
                  return `${point.timeLabel} - ${point.isOffPeak ? 'Heures creuses' : 'Heures pleines'}`;
                }
                return label;
              }}
            />
            <Legend />
            
            {/* Lignes de référence pour délimiter les quadrants */}
            <ReferenceLine 
              x={6} 
              stroke="#94A3B8" 
              strokeDasharray="3 3" 
              label={{ value: "6h", position: "top" }}
            />
            <ReferenceLine 
              x={22} 
              stroke="#94A3B8" 
              strokeDasharray="3 3" 
              label={{ value: "22h", position: "top" }}
            />
            <ReferenceLine 
              y={contractAnalysis.avgConsumption} 
              stroke="#94A3B8" 
              strokeDasharray="3 3" 
              label={{ 
                value: `Moyenne: ${contractAnalysis.avgConsumption.toFixed(2)} kW`, 
                position: "topLeft" 
              }}
            />
            
            <Scatter 
              dataKey="avgPower" 
              name="Puissance par heure"
            >
              {contractAnalysis.quadrants.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Légende des quadrants */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <div>
            <p className="text-sm font-medium text-green-900">Q1: Nuit - Faible</p>
            <p className="text-xs text-green-700">Consommation de base nocturne</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <div>
            <p className="text-sm font-medium text-blue-900">Q2: Jour - Faible</p>
            <p className="text-xs text-blue-700">Consommation diurne modérée</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
          <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
          <div>
            <p className="text-sm font-medium text-orange-900">Q3: Jour - Forte</p>
            <p className="text-xs text-orange-700">Pics de consommation diurne</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <div>
            <p className="text-sm font-medium text-red-900">Q4: Nuit - Forte</p>
            <p className="text-xs text-red-700">Consommation nocturne élevée</p>
          </div>
        </div>
      </div>

      {/* Recommandations basées sur l'analyse */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Recommandations pour l'installation solaire</h4>
            <div className="space-y-1 text-sm text-blue-800">
              {contractAnalysis.contractType === 'Heures Creuses' && (
                <>
                  <p>• Votre contrat heures creuses est idéal pour une installation avec batterie</p>
                  <p>• Programmez le stockage pendant les heures creuses ({contractAnalysis.offPeakPeriods.join(', ')})</p>
                </>
              )}
              {contractAnalysis.contractType === 'Base' && (
                <>
                  <p>• Votre contrat de base bénéficierait d'une optimisation de l'autoconsommation</p>
                  <p>• Considérez un passage en heures creuses avec une installation solaire + batterie</p>
                </>
              )}
              <p>• Puissance recommandée: {Math.ceil(contractAnalysis.maxConsumption * 1.2)} kW (120% du pic)</p>
              <p>• Capacité de stockage suggérée: {Math.ceil(contractAnalysis.avgConsumption * 4)} kWh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDetectionChart;