import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Calculator, FileText, Link,
  DoorOpen, CheckSquare,
  Settings, Briefcase, FileDown, BookOpen, Sun, Clock
} from 'lucide-react';
import { useClient } from '../contexts/client';
import { scrollToTop } from '../utils/scroll';

interface StepNavigationProps {
  isCollapsed: boolean;
}

export default function StepNavigation({ isCollapsed }: StepNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { clientInfo } = useClient();
  const [clickCount, setClickCount] = useState(0);
  const [showDevPages, setShowDevPages] = useState(false);

  const hasRequiredInfo = Boolean(
    (clientInfo.typeClient === 'particulier'
      ? clientInfo.nom && clientInfo.prenom
      : clientInfo.denominationSociale && clientInfo.nomRepresentant && clientInfo.prenomRepresentant
    )
  );

  const handleMenuClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 5) {
      setShowDevPages(true);
    }
  };

  const steps = [
    {
      path: '/',
      label: 'Dimensionnement',
      icon: ClipboardList,
      description: 'Caractéristiques de votre installation'
    },
    {
      path: '/projection',
      label: 'Projection financière',
      icon: Calculator,
      description: 'Simulation de rentabilité'
    },
    {
      path: '/report',
      label: 'Rapport PDF',
      icon: FileDown,
      description: 'Générer un rapport détaillé',
    }
  ];

  const devPages = [
    {
      path: '/pvgis',
      label: 'PVGIS',
      icon: Sun,
      description: 'Calcul de production avec PVGIS',
      isStatic: true
    },
    {
      path: '/pvgis-hourly',
      label: 'PVGIS Horaire',
      icon: Clock,
      description: 'Production heure par heure',
      isStatic: true
    },
    {
      path: '/modalites-abonnement',
      label: "Modalités d'abonnement",
      icon: FileText,
      description: 'Conditions et engagements',
      isStatic: true
    },
    {
      path: '/modalites-sortie',
      label: 'Modalités de sortie',
      icon: DoorOpen,
      description: 'Conditions de résiliation',
      isStatic: true
    },
    {
      path: '/abie-link',
      label: 'Abie Link',
      icon: Link,
      description: 'Switchgrid',
      isStatic: true
    }
  ];

  const handleStepClick = (path: string, isStatic?: boolean) => {
    if (isStatic || path === '/abie-link' || path === '/settings' || path === '/test-icoll' || path === '/agence' || path === '/enedis-test' || path === '/enedis-datahub') {
      navigate(path);
      scrollToTop();
      return;
    }

    if (!hasRequiredInfo && path !== '/') {
      alert('Veuillez remplir tous les champs obligatoires avant de continuer.');
      return;
    }

    navigate(path);
    scrollToTop();
  };

  const openBrochure = () => {
    window.open('https://xpxbxfuckljqdvkajlmx.supabase.co/storage/v1/object/public/book//BROCHURE%20ABIE%20V2.pdf', '_blank');
  };

  return (
    <nav className={`h-full py-6 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`} onClick={handleMenuClick}>
      <div className="space-y-1">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = location.pathname === step.path;
          const isDisabled = !step.isStatic && !hasRequiredInfo && step.path !== '/';

          return (
            <button
              key={step.path}
              onClick={() => handleStepClick(step.path, step.isStatic)}
              disabled={isDisabled}
              title={isCollapsed ? step.label : undefined}
              className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#2F80ED]/10 text-[#2F80ED]'
                  : isDisabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-white/75'
              }`}
            >
              <div className="flex-shrink-0 flex items-center justify-center mt-0.5">
                <Icon className={`h-5 w-5 ${
                  isActive ? 'text-[#2F80ED]' : isDisabled ? 'text-gray-300' : 'text-gray-400'
                }`} />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <span className="block text-sm font-medium">{step.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{step.description}</span>
                </div>
              )}
            </button>
          );
        })}

        {/* Utility links */}
        <div className={`mt-8 pt-6 border-t border-gray-300/50 space-y-2`}>
          <button
            onClick={() => handleStepClick('/agence')}
            title={isCollapsed ? 'Info agence' : undefined}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
              location.pathname === '/agence'
                ? 'bg-[#2F80ED]/10 text-[#2F80ED]'
                : 'text-gray-600 hover:bg-white/75'
            }`}
          >
            <Briefcase className={`h-5 w-5 ${
              location.pathname === '/agence' ? 'text-[#2F80ED]' : 'text-gray-400'
            }`} />
            {!isCollapsed && (
              <span className="text-sm font-medium">Info agence</span>
            )}
          </button>

          {/* Book link */}
          <button
            onClick={openBrochure}
            title={isCollapsed ? 'Brochure commerciale' : undefined}
            className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-gray-600 hover:bg-white/75"
          >
            <BookOpen className="h-5 w-5 text-gray-400" />
            {!isCollapsed && (
              <span className="text-sm font-medium">Brochure commerciale</span>
            )}
          </button>

          {/* Dev pages - hidden by default */}
          {showDevPages && devPages.map((page) => {
            const Icon = page.icon;
            const isActive = location.pathname === page.path;

            return (
              <button
                key={page.path}
                onClick={() => handleStepClick(page.path, page.isStatic)}
                title={isCollapsed ? page.label : undefined}
                className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#F2994A]/10 text-[#F2994A]'
                    : 'text-gray-600 hover:bg-white/75'
                }`}
              >
                <div className="flex-shrink-0 flex items-center justify-center mt-0.5">
                  <Icon className={`h-5 w-5 ${
                    isActive ? 'text-[#F2994A]' : 'text-gray-400'
                  }`} />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <span className="block text-sm font-medium">{page.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{page.description}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Settings button */}
        <div className="mt-4">
          <button
            onClick={() => handleStepClick('/settings')}
            title={isCollapsed ? 'Réglages' : undefined}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
              location.pathname === '/settings'
                ? 'bg-white/75 text-gray-900'
                : 'text-gray-600 hover:bg-white/75'
            }`}
          >
            <Settings className={`h-5 w-5 ${
              location.pathname === '/settings' ? 'text-gray-900' : 'text-gray-400'
            }`} />
            {!isCollapsed && (
              <span className="text-sm font-medium">Réglages</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}