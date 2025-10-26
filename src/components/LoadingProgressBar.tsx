import React from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface LoadingProgressBarProps {
  progress: number;
  stage: string;
  isLoading: boolean;
  error?: string | null;
  success?: string | null;
}

export default function LoadingProgressBar({ 
  progress, 
  stage, 
  isLoading, 
  error, 
  success 
}: LoadingProgressBarProps) {
  if (!isLoading && !error && !success) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {isLoading ? 'Récupération des données en cours' : error ? 'Erreur' : 'Terminé'}
        </h3>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
          {error && <AlertCircle className="h-5 w-5 text-red-500" />}
          {success && !isLoading && <CheckCircle className="h-5 w-5 text-green-500" />}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{stage}</span>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              error ? 'bg-red-500' : success && !isLoading ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Étapes détaillées */}
      <div className="space-y-2">
        {[
          { name: 'Identité client', range: [0, 10] },
          { name: 'Adresse client', range: [10, 20] },
          { name: 'Contrats client', range: [20, 30] },
          { name: 'Contacts client', range: [30, 40] },
          { name: 'Consommation quotidienne', range: [40, 60] },
          { name: 'Puissances maximales', range: [60, 80] },
          { name: 'Courbe de charge annuelle', range: [80, 95] },
          { name: 'Finalisation', range: [95, 100] }
        ].map((step, index) => {
          const isActive = progress >= step.range[0] && progress < step.range[1];
          const isCompleted = progress >= step.range[1];
          
          return (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-300'
              }`}>
                {isCompleted && <CheckCircle className="h-3 w-3 text-white" />}
                {isActive && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
              </div>
              <span className={`text-sm ${
                isCompleted ? 'text-green-700 font-medium' : 
                isActive ? 'text-blue-700 font-medium' : 'text-gray-500'
              }`}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Messages d'état */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && !isLoading && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Veuillez patienter pendant la récupération des données...
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Cette opération peut prendre quelques minutes selon la quantité de données à traiter.
          </p>
        </div>
      )}
    </div>
  );
}