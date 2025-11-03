import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { ExternalLink } from 'lucide-react';
import { FinancialProjection } from '../../types/financial';
import { formatCurrency } from '../../utils/formatters';
import { calculateTotalInvestment } from '../../utils/calculations/investmentCalculator';

interface ReturnOnInvestmentChartProps {
  projection: FinancialProjection;
  isSubscription?: boolean;
  onShowInvestmentDetails?: () => void;
  parameters?: any;
  installedPower?: number;
  inverterType?: 'central' | 'solenso' | 'enphase';
  mountingSystem?: 'surimposition' | 'bac-lestes' | 'integration';
  includeEcojoko?: boolean;
  selectedPeriod?: 20 | 25 | 30;
}

export default function ReturnOnInvestmentChart({
  projection,
  isSubscription = false,
  onShowInvestmentDetails,
  parameters,
  installedPower = 0,
  inverterType = 'central',
  mountingSystem = 'surimposition',
  includeEcojoko = false,
  selectedPeriod = 25
}: ReturnOnInvestmentChartProps) {

  const data = [];

  // Calculate initial cost using the investment calculator
  let initialCost = 0;
  if (parameters && installedPower > 0) {
    try {
      const investment = calculateTotalInvestment(
        parameters,
        installedPower,
        inverterType,
        mountingSystem,
        includeEcojoko
      );
      
      if (isSubscription) {
        initialCost = investment.smartBatterySetup + investment.myBatterySetup + investment.physicalBattery;
      } else {
        initialCost = investment.totalInvestment;
      }
    } catch (error) {
      console.error('Error calculating investment:', error);
      // Fallback to projection values
      if (isSubscription) {
        initialCost = (projection.fraisActivation || 0) +
                      (projection.smartBatteryInitialCost || 0) +
                      (projection.physicalBatteryInitialCost || 0);
      } else {
        initialCost = projection.prixFinal;
      }
    }
  } else {
    // Fallback to projection values
    if (isSubscription) {
      initialCost = (projection.fraisActivation || 0) +
                    (projection.smartBatteryInitialCost || 0) +
                    (projection.physicalBatteryInitialCost || 0);
    } else {
      initialCost = projection.prixFinal;
    }
  }

  let cumulativeFlow = -initialCost;

  for (let i = 0; i < Math.min(selectedPeriod, projection.projectionAnnuelle.length); i++) {
    const year = projection.projectionAnnuelle[i];
    cumulativeFlow += year.gainTotal;

    // Add prime à l'autoconsommation in year 1
    if (i === 0 && projection.primeAutoconsommation > 0) {
      cumulativeFlow += projection.primeAutoconsommation;
    }

    data.push({
      annee: `An ${i + 1}`,
      fluxCumule: Math.round(cumulativeFlow)
    });
  }

  const breakEvenYear = data.findIndex(d => d.fluxCumule >= 0);
  const hasBreakEven = breakEvenYear !== -1;

  let preciseBreakEvenYear = 0;
  if (hasBreakEven && breakEvenYear > 0) {
    const yearBefore = data[breakEvenYear - 1].fluxCumule;
    const yearAfter = data[breakEvenYear].fluxCumule;
    const yearlyGain = projection.projectionAnnuelle[breakEvenYear].gainTotal;
    const monthsNeeded = Math.abs(yearBefore) / yearlyGain * 12;
    preciseBreakEvenYear = breakEvenYear + (monthsNeeded / 12);
  } else if (hasBreakEven && breakEvenYear === 0) {
    preciseBreakEvenYear = 1;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Retour sur investissement sur 30 ans
        </h3>
        <p className="text-sm text-gray-600">
          {isSubscription ? (
            <>
              Ce graphique montre le flux financier cumulé de votre abonnement.
              {hasBreakEven && breakEvenYear === 0 ? (
                <span className="block mt-1 text-green-600 font-medium">
                  Vous commencez à économiser dès la première année.
                </span>
              ) : !hasBreakEven ? (
                <span className="block mt-1 text-amber-600 font-medium">
                  Les gains deviennent positifs après la fin de l'abonnement.
                </span>
              ) : (
                <span className="block mt-1 text-green-600 font-medium">
                  Votre abonnement devient rentable dès l'année {breakEvenYear + 1}.
                </span>
              )}
            </>
          ) : (
            <>
              Ce graphique montre le flux financier cumulé incluant votre investissement initial.
              {hasBreakEven && (
                <span className="block mt-1 text-green-600 font-medium">
                  Votre installation sera amortie en {preciseBreakEvenYear.toFixed(1)} an{preciseBreakEvenYear > 1 ? 's' : ''}.
                </span>
              )}
            </>
          )}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="annee"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Flux cumulé']}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={() => 'Flux financier cumulé'}
          />
          <ReferenceLine y={0} stroke="#000" strokeWidth={2} strokeDasharray="3 3" />
          <Bar
            dataKey="fluxCumule"
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fluxCumule >= 0 ? '#10b981' : '#ec4899'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-4 relative">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-red-600 font-medium">
              Investissement initial
            </div>
            {onShowInvestmentDetails && (
              <button
                onClick={onShowInvestmentDetails}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-2 py-1 rounded transition-colors"
                title="Voir le détail de l'investissement"
              >
                <ExternalLink className="h-3 w-3" />
                Détails
              </button>
            )}
          </div>
          <div className="text-2xl font-bold text-red-700">
            {formatCurrency(initialCost)}
          </div>
          {onShowInvestmentDetails && (
            <div className="text-xs text-red-500 mt-1">
              Cliquez sur "Détails" pour voir la répartition
            </div>
          )}
        </div>

        {hasBreakEven && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium mb-1">
              Amortissement
            </div>
            <div className="text-2xl font-bold text-green-700">
              {preciseBreakEvenYear.toFixed(1)} an{preciseBreakEvenYear > 1 ? 's' : ''}
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">
            Solde de trésorerie à {selectedPeriod} ans
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(data[data.length - 1]?.fluxCumule || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}