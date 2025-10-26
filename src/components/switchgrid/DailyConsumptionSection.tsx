import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { createR65Order } from '../../utils/api/switchgridR65Api';
import AnnualConsumptionChart from '../AnnualConsumptionChart';

interface DailyConsumptionSectionProps {
  consentId: string;
  prm: string;
  onDataRetrieved?: (data: { annualConsumption: number; dailyData: any[] }) => void;
}

const DailyConsumptionSection: React.FC<DailyConsumptionSectionProps> = ({
  consentId,
  prm,
  onDataRetrieved
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchDailyConsumption = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('📊 [DailyConsumptionSection] Début récupération R65');
        console.log('📊 [DailyConsumptionSection] PRM:', prm);
        console.log('📊 [DailyConsumptionSection] Consent ID:', consentId);

        // Calculer les dates (365 derniers jours)
        const now = new Date();
        const endDate = new Date(now);
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 365);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        console.log('📅 [DailyConsumptionSection] Période:', formattedStartDate, '→', formattedEndDate);

        // Appel à l'API R65
        console.log('🚀 [DailyConsumptionSection] Appel createR65Order...');
        const result = await createR65Order({
          prm,
          consent_id: consentId,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          returnRows: true
        });

        console.log('✅ [DailyConsumptionSection] Réponse reçue:', result);

        if (result.rows && result.rows.length > 0) {
          console.log(`✅ [DailyConsumptionSection] ${result.rows.length} jours de données reçus`);

          // Formater les données pour le graphique
          const chartData = result.rows.map(r => ({
            date: r.date,
            peak_hours: 0,
            off_peak_hours: 0,
            total: r.energy_total_kwh
          }));

          setDailyData(chartData);

          // Calculer la consommation annuelle totale
          const annualConsumption = Math.round(
            result.rows.reduce((sum, r) => sum + r.energy_total_kwh, 0)
          );

          console.log('📊 [DailyConsumptionSection] Consommation annuelle calculée:', annualConsumption, 'kWh');

          // Notifier le parent avec les données
          if (onDataRetrieved) {
            console.log('📤 [DailyConsumptionSection] Notification du parent...');
            onDataRetrieved({
              annualConsumption,
              dailyData: chartData
            });
          }
        } else {
          console.error('❌ [DailyConsumptionSection] Aucune donnée dans la réponse:', result);
          throw new Error('Aucune donnée de consommation reçue');
        }
      } catch (err: any) {
        console.error('❌ [DailyConsumptionSection] Erreur:', err);
        console.error('❌ [DailyConsumptionSection] Stack:', err.stack);
        setError(err.message || 'Erreur lors de la récupération des données');
      } finally {
        console.log('🏁 [DailyConsumptionSection] Fin du chargement');
        setLoading(false);
      }
    };

    fetchDailyConsumption();
  }, [consentId, prm]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">
              Récupération de vos données de consommation...
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Cette opération peut prendre quelques secondes
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Erreur de récupération</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">Aucune donnée de consommation disponible.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <AnnualConsumptionChart
        data={dailyData}
        loading={false}
        error={null}
        title="Consommation quotidienne sur l'année (kWh)"
        hpHcTotals={undefined}
        hpHcMonthly={[]}
        hpHcWeekly={[]}
      />
    </div>
  );
};

export default DailyConsumptionSection;
export { DailyConsumptionSection };
