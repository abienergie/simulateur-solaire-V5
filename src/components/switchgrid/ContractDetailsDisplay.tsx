import React, { useState } from 'react';
import { FileText, Zap, Calendar, Building, MapPin, User, CheckCircle, Clock } from 'lucide-react';
import { getContractFormulaInfo, getTariffDescription } from '../../utils/constants/contractFormulas';

interface ContractDetailsDisplayProps {
  contractData: any;
  tariffType?: string;
  formulaCode?: string;
  updatedAt?: string;
}

export default function ContractDetailsDisplay({
  contractData,
  tariffType,
  formulaCode,
  updatedAt
}: ContractDetailsDisplayProps) {
  const [clickCount, setClickCount] = useState(0);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!contractData) {
    return null;
  }

  const handleHeaderClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 5) {
      setShowRawJson(!showRawJson);
      setClickCount(0);
    }

    setTimeout(() => {
      if (clickCount === newCount) {
        setClickCount(0);
      }
    }, 2000);
  };

  // Parser le JSON si c'est une string
  let parsedData = contractData;
  if (typeof contractData === 'string') {
    try {
      parsedData = JSON.parse(contractData);
    } catch (e) {
      console.error('Erreur parsing JSON contract_data:', e);
      return null;
    }
  }

  // Extraire les données de la structure Switchgrid C68
  const point = parsedData.point || parsedData;
  const attributes = point.attributes || {};
  const donneesGenerales = point.donneesGenerales || {};
  const situationComptage = point.situationComptage || {};
  const situationAlimentation = point.situationAlimentation || {};
  const situationContractuelle = point.situationContractuelle || {};

  // Extraction des valeurs spécifiques
  const prm = attributes.id || 'Non disponible';

  const puissanceSouscrite = situationContractuelle.structureTarifaire?.puissanceSouscriteMax?.valeur ||
                             situationAlimentation.alimentationPrincipale?.puissanceRaccordementSoutirage?.valeur ||
                             'Non disponible';
  const unitePuissance = situationContractuelle.structureTarifaire?.puissanceSouscriteMax?.unite ||
                        situationAlimentation.alimentationPrincipale?.puissanceRaccordementSoutirage?.unite ||
                        'kVA';

  const formuleTarifaire = formulaCode ||
                          situationContractuelle.structureTarifaire?.formuleTarifaireAcheminement?.attributes?.code ||
                          situationContractuelle.structureTarifaire?.formuleTarifaireAcheminement?.libelle ||
                          'Non disponible';

  // Enrichir avec les informations de la formule
  const formulaInfo = getContractFormulaInfo(formuleTarifaire);
  const tariffDescription = getTariffDescription(formuleTarifaire);

  const typeCompteur = situationComptage.dispositifComptage?.typeComptage?.libelle ||
                       situationComptage.dispositifComptage?.typeComptage?.attributes?.code ||
                       'Non disponible';

  const etatContractuel = donneesGenerales.etatContractuel?.libelle ||
                         donneesGenerales.etatContractuel?.attributes?.code ||
                         'Non disponible';

  const segment = donneesGenerales.segment?.libelle ||
                  donneesGenerales.segment?.attributes?.code ||
                  'Non disponible';

  const plageHeuresCreuses = situationComptage.relais?.plageHeuresCreuses ||
                            situationComptage.dispositifComptage?.relais?.plageHeuresCreuses ||
                            null;

  const calendrier = situationContractuelle.structureTarifaire?.calendrierFrn?.libelle ||
                     situationContractuelle.structureTarifaire?.calendrierFrn?.attributes?.code ||
                     'Non disponible';

  const adresse = donneesGenerales.adresseInstallation?.numeroEtNomVoie || '';
  const codePostal = donneesGenerales.adresseInstallation?.codePostal || '';
  const commune = donneesGenerales.adresseInstallation?.commune?.libelle || '';

  const domaineTension = situationAlimentation.alimentationPrincipale?.domaineTension?.libelle ||
                        situationAlimentation.alimentationPrincipale?.domaineTension?.attributes?.code ||
                        '';

  const tensionLivraison = situationAlimentation.alimentationPrincipale?.tensionLivraison?.libelle ||
                          situationAlimentation.alimentationPrincipale?.tensionLivraison?.attributes?.code ||
                          '';

  const getTariffBadgeColor = (type?: string) => {
    switch (type) {
      case 'BASE':
        return 'bg-blue-100 text-blue-800';
      case 'HP_HC':
        return 'bg-orange-100 text-orange-800';
      case 'TEMPO':
        return 'bg-purple-100 text-purple-800';
      case 'EJP':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTariffLabel = (type?: string) => {
    switch (type) {
      case 'BASE':
        return 'Tarif Base';
      case 'HP_HC':
        return 'Heures Pleines / Heures Creuses';
      case 'TEMPO':
        return 'Tarif Tempo';
      case 'EJP':
        return 'Tarif EJP';
      default:
        return type || 'Non détecté';
    }
  };

  if (showRawJson) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div
          className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 cursor-pointer hover:from-green-700 hover:to-green-600 transition-colors"
          onClick={handleHeaderClick}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-white" />
              <h3 className="text-xl font-semibold text-white">Détails du contrat (JSON brut)</h3>
            </div>
            <span className="text-white text-xs opacity-75">Cliquez 5 fois pour masquer</span>
          </div>
        </div>
        <div className="p-6 bg-gray-50">
          <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[600px] font-mono">
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div
        className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 cursor-pointer hover:from-green-700 hover:to-green-600 transition-colors"
        onClick={handleHeaderClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-white" />
            <h3 className="text-xl font-semibold text-white">Détails du contrat</h3>
          </div>
          {tariffType && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTariffBadgeColor(tariffType)} bg-white`}>
              {getTariffLabel(tariffType)}
            </span>
          )}
        </div>
      </div>

      {updatedAt && (
        <div className="bg-green-50 border-b border-green-100 px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium">Données C68 chargées avec succès</span>
            <span className="text-green-600">•</span>
            <span className="text-green-700">
              Dernière mise à jour : {new Date(updatedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Section Informations principales */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Informations principales
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={<Zap className="h-4 w-4" />}
              label="Point de Référence (PRM)"
              value={prm}
            />
            <InfoItem
              icon={<Zap className="h-4 w-4" />}
              label="Puissance souscrite"
              value={puissanceSouscrite !== 'Non disponible' ? `${puissanceSouscrite} ${unitePuissance}` : 'Non disponible'}
            />
            <InfoItem
              icon={<FileText className="h-4 w-4" />}
              label="Formule tarifaire"
              value={formuleTarifaire}
            />
            {formulaInfo && (
              <InfoItem
                icon={<Clock className="h-4 w-4" />}
                label="Type de tarification"
                value={tariffDescription}
                highlight
              />
            )}
            <InfoItem
              icon={<Building className="h-4 w-4" />}
              label="Type de compteur"
              value={typeCompteur}
            />
          </div>
        </div>

        {/* Section Contrat */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            État du contrat
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={<FileText className="h-4 w-4" />}
              label="État contractuel"
              value={etatContractuel}
            />
            <InfoItem
              icon={<User className="h-4 w-4" />}
              label="Segment client"
              value={segment}
            />
            {plageHeuresCreuses && (
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Plage heures creuses"
                value={plageHeuresCreuses}
                highlight
              />
            )}
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="Calendrier distributeur"
              value={calendrier}
            />
          </div>
        </div>

        {/* Section Détails tarifaires */}
        {formulaInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Détails de la formule tarifaire
            </h4>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-blue-900">Nom complet: </span>
                <span className="text-blue-800">{formulaInfo.name}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-blue-900">Description: </span>
                <span className="text-blue-700">{formulaInfo.description}</span>
              </div>
              <div className="flex gap-4 mt-3">
                <div className="bg-white px-3 py-2 rounded border border-blue-200">
                  <span className="text-xs font-medium text-blue-600 uppercase">Cadrans</span>
                  <div className="text-lg font-bold text-blue-900">{formulaInfo.timeSlots}</div>
                </div>
                <div className="bg-white px-3 py-2 rounded border border-blue-200">
                  <span className="text-xs font-medium text-blue-600 uppercase">Tension</span>
                  <div className="text-lg font-bold text-blue-900">{formulaInfo.voltage}</div>
                </div>
                <div className="bg-white px-3 py-2 rounded border border-blue-200 flex-1">
                  <span className="text-xs font-medium text-blue-600 uppercase">Segment</span>
                  <div className="text-lg font-bold text-blue-900">{formulaInfo.segment}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Adresse */}
        {(adresse || codePostal || commune) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Adresse d'installation
            </h4>
            <div className="grid grid-cols-1 gap-4">
              {adresse && (
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Adresse"
                  value={adresse}
                />
              )}
              {(codePostal || commune) && (
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Localisation"
                  value={`${codePostal} ${commune}`.trim()}
                />
              )}
            </div>
          </div>
        )}

        {/* Informations techniques */}
        {(domaineTension || tensionLivraison) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Informations techniques
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {domaineTension && (
                <InfoItem
                  icon={<Zap className="h-4 w-4" />}
                  label="Domaine de tension"
                  value={domaineTension}
                />
              )}
              {tensionLivraison && (
                <InfoItem
                  icon={<Zap className="h-4 w-4" />}
                  label="Tension de livraison"
                  value={tensionLivraison}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

function InfoItem({ icon, label, value, highlight = false }: InfoItemProps) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      highlight
        ? 'bg-orange-50 border-2 border-orange-200'
        : 'bg-gray-50'
    }`}>
      <div className={`flex-shrink-0 mt-1 ${
        highlight ? 'text-orange-600' : 'text-gray-500'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <dt className={`text-xs font-medium uppercase tracking-wide mb-1 ${
          highlight ? 'text-orange-700' : 'text-gray-500'
        }`}>
          {label}
        </dt>
        <dd className={`text-sm font-semibold break-words ${
          highlight ? 'text-orange-900' : 'text-gray-900'
        }`}>
          {value}
        </dd>
      </div>
    </div>
  );
}
