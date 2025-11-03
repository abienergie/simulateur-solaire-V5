import React, { useState, useEffect, useRef } from 'react';
import { FinancialProjection } from '../../types/financial';
import { formatCurrency } from '../../utils/formatters';
import html2canvas from 'html2canvas';
import ReturnOnInvestmentChart from './ReturnOnInvestmentChart';

interface ProjectionTableProps {
  projection: FinancialProjection;
  isSubscription?: boolean;
  onShowInvestmentDetails?: () => void;
  parameters?: any;
  installedPower?: number;
  inverterType?: 'central' | 'solenso' | 'enphase';
  mountingSystem?: 'surimposition' | 'bac-lestes' | 'integration';
  includeEcojoko?: boolean;
}

export default function ProjectionTable({
  projection,
  isSubscription = false,
  onShowInvestmentDetails,
  parameters,
  installedPower,
  inverterType,
  mountingSystem,
  includeEcojoko
}: ProjectionTableProps) {
  const [activeTab, setActiveTab] = useState<'projection' | 'amortissement'>('projection');
  const [selectedPeriod, setSelectedPeriod] = useState<20 | 25 | 30>(() => {
    const saved = localStorage.getItem('projection_period');
    const parsedValue = saved ? parseInt(saved) : 25;
    // Ensure the value is valid (20, 25, or 30), otherwise default to 25
    return [20, 25, 30].includes(parsedValue) ? (parsedValue as 20 | 25 | 30) : 25;
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // Save selected period to localStorage
  useEffect(() => {
    localStorage.setItem('projection_period', selectedPeriod.toString());
  }, [selectedPeriod]);
  
  const hasSubscription = projection.projectionAnnuelle[0].coutAbonnement > 0;
  const prixFinal = projection.prixFinal;
  const showMyLight = projection.projectionAnnuelle[0].coutMyLight > 0;

  // Determine battery label based on type
  const batteryLabel = parameters?.batterySelection?.type === 'urbansolar' ? 'URBAN' :
                       parameters?.batterySelection?.type === 'mybattery' ? 'MYBATTERY' :
                       'MYLIGHT';

  // Calculate totals based on selected period
  const selectedYears = projection.projectionAnnuelle.slice(0, selectedPeriod);
  const totalSelectedEconomies = selectedYears.reduce((sum, year) => sum + year.economiesAutoconsommation, 0);
  const totalSelectedRevente = selectedYears.reduce((sum, year) => sum + year.revenusRevente, 0);
  const totalSelectedAbonnement = selectedYears.reduce((sum, year) => sum + year.coutAbonnement, 0);
  const totalSelectedMyLight = selectedYears.reduce((sum, year) => sum + year.coutMyLight, 0);
  const totalSelectedGain = selectedYears.reduce((sum, year) => sum + year.gainTotal, 0);

  // Calculate totals for 20 years (for PDF capture)
  const first20Years = projection.projectionAnnuelle.slice(0, 20);
  const total20YearsEconomies = first20Years.reduce((sum, year) => sum + year.economiesAutoconsommation, 0);
  const total20YearsRevente = first20Years.reduce((sum, year) => sum + year.revenusRevente, 0);
  const total20YearsAbonnement = first20Years.reduce((sum, year) => sum + year.coutAbonnement, 0);
  const total20YearsMyLight = first20Years.reduce((sum, year) => sum + year.coutMyLight, 0);
  const total20YearsGain = first20Years.reduce((sum, year) => sum + year.gainTotal, 0);

  // Capture the table for PDF on component mount
  useEffect(() => {
    const captureTableForPDF = async () => {
      if (!captureRef.current) return;
      
      try {
        // Capture only the first 20 years + total row
        const canvas = await html2canvas(captureRef.current, { 
          backgroundColor: 'white',
          useCORS: true,
          scrollY: -window.scrollY,
          scale: 5, // Revenir à une échelle de 5 pour un bon équilibre qualité/taille
          logging: false,
          allowTaint: true,
          foreignObjectRendering: false
        });
        
        const dataUrl = canvas.toDataURL('image/png');
        localStorage.setItem('projection20ans_png', dataUrl);
        console.log('Projection table captured automatically for PDF with scale 5');
      } catch (error) {
        console.error('Error capturing projection table:', error);
      }
    };

    // Capture after a short delay to ensure rendering is complete
    const timer = setTimeout(() => {
      captureTableForPDF();
    }, 1000);

    return () => clearTimeout(timer);
  }, [projection]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div ref={tableRef} id="projection-30-ans" className="bg-white">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-6 bg-gray-50">
            <div className="flex">
              <button
                onClick={() => setActiveTab('projection')}
                className={`px-6 py-4 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === 'projection'
                    ? 'text-blue-600 border-blue-600 bg-white'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Projection financière
              </button>
              <button
                onClick={() => setActiveTab('amortissement')}
                className={`px-6 py-4 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === 'amortissement'
                    ? 'text-blue-600 border-blue-600 bg-white'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Tableau d'amortissement
              </button>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Période :</span>
              <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
                {([20, 25, 30] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                      selectedPeriod === period
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {period} ans
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'amortissement' ? (
          <div className="p-6">
            <ReturnOnInvestmentChart
              projection={projection}
              isSubscription={isSubscription}
              onShowInvestmentDetails={onShowInvestmentDetails}
              parameters={parameters}
              installedPower={installedPower}
              inverterType={inverterType}
              mountingSystem={mountingSystem}
              includeEcojoko={includeEcojoko}
              selectedPeriod={selectedPeriod}
            />
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Année
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Production (kWh)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Autoconsommation
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Surplus
                </th>
                {hasSubscription && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abonnement
                  </th>
                )}
                {showMyLight && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {batteryLabel}
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gain total
                </th>
                {!hasSubscription && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rendement
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedYears.map((annee) => {
                const rendement = !hasSubscription ?
                  ((annee.economiesAutoconsommation + annee.revenusRevente) / prixFinal * 100) : 0;

                return (
                  <tr key={annee.annee} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {annee.annee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {Math.round(annee.production).toString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(annee.economiesAutoconsommation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                      {formatCurrency(annee.revenusRevente)}
                    </td>
                    {hasSubscription && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                        {annee.coutAbonnement > 0 ? formatCurrency(-annee.coutAbonnement) : '-'}
                      </td>
                    )}
                    {showMyLight && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                        {annee.coutMyLight > 0 ? formatCurrency(-annee.coutMyLight) : '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(annee.gainTotal)}
                    </td>
                    {!hasSubscription && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600">
                        {rendement.toFixed(1)}%
                      </td>
                    )}
                  </tr>
                );
              })}
              {/* Total row */}
              <tr className="bg-gray-100 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Total sur {selectedPeriod} ans
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                  {formatCurrency(totalSelectedEconomies)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                  {formatCurrency(totalSelectedRevente)}
                </td>
                {hasSubscription && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                    {formatCurrency(-totalSelectedAbonnement)}
                  </td>
                )}
                {showMyLight && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                    {formatCurrency(-totalSelectedMyLight)}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {formatCurrency(totalSelectedGain)}
                </td>
                {!hasSubscription && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600">
                    -
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
        )}

        {/* Hidden table for PDF capture - always shows 20 years */}
        <div className="hidden">
          <div ref={captureRef} className="bg-white p-6">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Année
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Production
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Autoconsommation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Surplus
                  </th>
                  {hasSubscription && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Abonnement
                    </th>
                  )}
                  {showMyLight && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      {batteryLabel}
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    Gain total
                  </th>
                  {!hasSubscription && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      Rendement
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {first20Years.map((annee) => {
                const rendement = !hasSubscription ? 
                  ((annee.economiesAutoconsommation + annee.revenusRevente) / prixFinal * 100) : 0;

                return (
                  <tr key={annee.annee} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {annee.annee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {Math.round(annee.production).toString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(annee.economiesAutoconsommation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                      {formatCurrency(annee.revenusRevente)}
                    </td>
                    {hasSubscription && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                        {annee.coutAbonnement > 0 ? formatCurrency(-annee.coutAbonnement) : '-'}
                      </td>
                    )}
                    {showMyLight && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                        {annee.coutMyLight > 0 ? formatCurrency(-annee.coutMyLight) : '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(annee.gainTotal)}
                    </td>
                    {!hasSubscription && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600">
                        {rendement.toFixed(1)}%
                      </td>
                    )}
                  </tr>
                );
              })}

                {/* Total row for 20 years */}
                <tr className="bg-gray-100 font-medium border-t-2 border-gray-300">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Total sur 20 ans
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                    {formatCurrency(total20YearsEconomies)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                    {formatCurrency(total20YearsRevente)}
                  </td>
                  {hasSubscription && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                      {formatCurrency(-total20YearsAbonnement)}
                    </td>
                  )}
                  {showMyLight && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                      {formatCurrency(-total20YearsMyLight)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(total20YearsGain)}
                  </td>
                  {!hasSubscription && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600">
                      -
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
