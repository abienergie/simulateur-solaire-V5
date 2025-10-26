import React from 'react';
import { Lightbulb, AlertTriangle, Battery, Sun, Gauge, PiggyBank } from 'lucide-react';
import { getAutoconsommationMessage } from '../utils/calculations/autoconsommation';
import { formatCurrency } from '../utils/formatters';

interface RecommendationDisplayProps {
  recommendation: {
    nombreModules: number;
    puissanceCrete: number;
    production: {
      min: number;
      max: number;
      optimal: number;
    };
    tauxAutoconsommation: number;
    economiesAnnuelles: number;
    reventeAnnuelle: number;
    avertissement?: string | null;
  };
  consommationAnnuelle: number;
  departement: string;
}

export default function RecommendationDisplay({
  recommendation,
  consommationAnnuelle,
  departement
}: RecommendationDisplayProps) {
  if (!recommendation || !consommationAnnuelle) return null;

  const couvertureMin = Math.round((recommendation.production.min / consommationAnnuelle) * 100);
  const couvertureMax = Math.round((recommendation.production.max / consommationAnnuelle) * 100);
  const economiesTotal = recommendation.economiesAnnuelles + recommendation.reventeAnnuelle;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="h-7 w-7 text-blue-500" />
        <h3 className="text-xl font-semibold text-gray-900">
          Solution photovoltaïque recommandée
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-5 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Sun className="h-5 w-5 text-amber-500" />
            <h4 className="font-medium text-gray-900">Votre installation</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {recommendation.puissanceCrete.toFixed(2)} kWc
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {recommendation.nombreModules} panneaux haute performance de 500W
          </p>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Gauge className="h-5 w-5 text-green-500" />
            <h4 className="font-medium text-gray-900">Production solaire</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {recommendation.production.min.toLocaleString()} ~ {recommendation.production.max.toLocaleString()} kWh/an
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Cette installation peut couvrir de {couvertureMin}% à {couvertureMax}% de votre consommation actuelle
          </p>
        </div>
      </div>

      {recommendation.avertissement ? (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {recommendation.avertissement.replace(
              /Cette installation couvre (\d+)% de votre consommation\./,
              'Cette installation peut couvrir jusqu\'à $1% de votre consommation.'
            )}
          </p>
        </div>
      ) : (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            Cette installation est parfaitement dimensionnée pour maximiser vos économies 
            tout en optimisant votre investissement. Vous bénéficierez d'excellentes performances 
            et d'un retour sur investissement optimal.
          </p>
        </div>
      )}
    </div>
  );
}