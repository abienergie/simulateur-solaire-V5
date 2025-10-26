import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { FinancialParameters } from '../../types/financial';
import { calculateTotalInvestment, getMonthlySubscriptionCost, InvestmentBreakdown } from '../../utils/calculations/investmentCalculator';
import { formatCurrency } from '../../utils/formatters';

interface InvestmentSummaryProps {
  parameters: FinancialParameters;
  installedPower: number;
  inverterType: 'central' | 'solenso' | 'enphase';
  mountingSystem: 'surimposition' | 'bac-lestes' | 'integration';
  includeEcojoko: boolean;
  className?: string;
}

export default function InvestmentSummary({
  parameters,
  installedPower,
  inverterType,
  mountingSystem,
  includeEcojoko,
  className = ''
}: InvestmentSummaryProps) {
  const [investment, setInvestment] = useState<InvestmentBreakdown | null>(null);
  const [monthlySubscription, setMonthlySubscription] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Recalculate investment when parameters change
  useEffect(() => {
    const calculateInvestment = () => {
      try {
        const breakdown = calculateTotalInvestment(
          parameters,
          installedPower,
          inverterType,
          mountingSystem,
          includeEcojoko
        );
        
        const monthlyCost = getMonthlySubscriptionCost(parameters, installedPower);
        
        setInvestment(breakdown);
        setMonthlySubscription(monthlyCost);
        setLastUpdate(new Date());
        
        console.log('💰 Investment recalculated:', {
          totalInvestment: breakdown.totalInvestment,
          monthlySubscription: monthlyCost,
          batteryType: parameters.batterySelection?.type,
          financingMode: parameters.financingMode
        });
        
      } catch (error) {
        console.error('Error calculating investment:', error);
      }
    };

    calculateInvestment();
  }, [
    parameters.financingMode,
    parameters.batterySelection,
    parameters.primeAutoconsommation,
    parameters.remiseCommerciale,
    installedPower,
    inverterType,
    mountingSystem,
    includeEcojoko
  ]);

  // Listen for battery selection changes
  useEffect(() => {
    const handleBatteryChange = () => {
      console.log('🔋 Battery selection changed, recalculating investment...');
      const breakdown = calculateTotalInvestment(
        parameters,
        installedPower,
        inverterType,
        mountingSystem,
        includeEcojoko
      );
      setInvestment(breakdown);
      setLastUpdate(new Date());
    };

    window.addEventListener('batterySelectionChanged', handleBatteryChange);
    return () => {
      window.removeEventListener('batterySelectionChanged', handleBatteryChange);
    };
  }, [parameters, installedPower, inverterType, mountingSystem, includeEcojoko]);

  if (!investment) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-gray-400" />
          <span className="text-gray-600">Calcul en cours...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {parameters.financingMode === 'cash' ? 'Investissement total' : 'Coût mensuel'}
          </h3>
        </div>
        <div className="text-xs text-gray-500">
          Mis à jour: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {parameters.financingMode === 'cash' ? (
        <div className="space-y-4">
          {/* Cash mode breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Installation de base</span>
              <span>{formatCurrency(investment.baseInstallation)}</span>
            </div>
            
            {investment.enphaseUpgrade > 0 && (
              <div className="flex justify-between text-sm">
                <span>Option Enphase</span>
                <span>{formatCurrency(investment.enphaseUpgrade)}</span>
              </div>
            )}
            
            {investment.physicalBattery > 0 && (
              <div className="flex justify-between text-sm">
                <span>Batterie physique</span>
                <span>{formatCurrency(investment.physicalBattery)}</span>
              </div>
            )}
            
            {investment.smartCharger > 0 && (
              <div className="flex justify-between text-sm">
                <span>Smart Charger</span>
                <span>{formatCurrency(investment.smartCharger)}</span>
              </div>
            )}
            
            {investment.mountingSystem > 0 && (
              <div className="flex justify-between text-sm">
                <span>Système de fixation</span>
                <span>{formatCurrency(investment.mountingSystem)}</span>
              </div>
            )}
            
            {investment.ecojoko > 0 && (
              <div className="flex justify-between text-sm">
                <span>Option Ecojoko</span>
                <span>{formatCurrency(investment.ecojoko)}</span>
              </div>
            )}
            
            {investment.smartBatterySetup > 0 && (
              <div className="flex justify-between text-sm">
                <span>Frais SmartBattery</span>
                <span>{formatCurrency(investment.smartBatterySetup)}</span>
              </div>
            )}
            
            {investment.myBatterySetup > 0 && (
              <div className="flex justify-between text-sm">
                <span>Frais MyBattery</span>
                <span>{formatCurrency(investment.myBatterySetup)}</span>
              </div>
            )}
          </div>
          
          <div className="border-t pt-2">
            <div className="flex justify-between text-sm">
              <span>Sous-total</span>
              <span>{formatCurrency(investment.subtotal)}</span>
            </div>
            
            {investment.subsidies > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Prime autoconsommation</span>
                <span>-{formatCurrency(investment.subsidies)}</span>
              </div>
            )}
            
            {investment.commercialDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Remise commerciale</span>
                <span>-{formatCurrency(investment.commercialDiscount)}</span>
              </div>
            )}
            
            {investment.promoDiscount > 0 && (
              <div className="flex justify-between text-sm text-purple-600">
                <span>Code promo</span>
                <span>-{formatCurrency(investment.promoDiscount)}</span>
              </div>
            )}
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total à payer</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(investment.totalInvestment)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Subscription mode */}
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {formatCurrency(monthlySubscription)}
            </div>
            <p className="text-sm text-gray-600">par mois</p>
          </div>
          
          {investment.smartBatterySetup > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                + {formatCurrency(investment.smartBatterySetup)} de frais de mise en service SmartBattery
              </p>
            </div>
          )}
          
          {investment.myBatterySetup > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                + {formatCurrency(investment.myBatterySetup)} de frais d'activation MyBattery
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Warning for missing prices */}
      {investment.baseInstallation === 0 && installedPower > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Prix manquant</p>
            <p className="text-sm text-amber-700">
              Aucun prix n'est configuré pour {installedPower.toFixed(1)} kWc. 
              Veuillez ajouter un prix personnalisé dans les paramètres.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}