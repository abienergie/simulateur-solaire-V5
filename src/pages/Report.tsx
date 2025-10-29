import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, FileText } from 'lucide-react';
import { useClient } from '../contexts/client';
import { useSolarData } from '../hooks/useSolarData';
import { useFinancialProjection } from '../hooks/useFinancialProjection';
import { formatDate } from '../utils/formatters';
import { getSunshineHours } from '../utils/sunshineData';
import PdfReportGenerator from '../components/PdfReportGenerator';

// URL du template PDF (mise à jour avec l'URL Supabase)
const PDF_TEMPLATE_URL = 'https://xpxbxfuckljqdvkajlmx.supabase.co/storage/v1/object/public/pdf-template/rapport-pdf-template.pdf';

export default function Report() {
  const { clientInfo, address } = useClient();
  const { params } = useSolarData();
  const [pdl, setPdl] = useState('');
  const [civilite, setCivilite] = useState(clientInfo.civilite || 'Monsieur');
  const [conseiller, setConseiller] = useState('');
  const [telephoneConseiller, setTelephoneConseiller] = useState('');
  const [telephoneClient, setTelephoneClient] = useState(clientInfo.telephone || '');
  const [emailClient, setEmailClient] = useState(clientInfo.email || '');
  const [commentaire, setCommentaire] = useState('');
  const { parameters, projection, calculateProjection } = useFinancialProjection();
  const [addressError, setAddressError] = useState<string | null>(null);

  // Validate address information
  useEffect(() => {
    if (!address.rue || !address.codePostal || !address.ville || !address.region) {
      setAddressError('Veuillez compléter toutes les informations d\'adresse avant de générer le rapport.');
    } else {
      setAddressError(null);
    }
  }, [address]);

  useEffect(() => {
    const savedResults = localStorage.getItem('solarResults');
    if (savedResults) {
      const { productionAnnuelle, puissanceCrete } = JSON.parse(savedResults);
      
      // Récupérer le mode de financement et les paramètres financiers du localStorage
      const savedFinancialMode = localStorage.getItem('financialMode');
      const savedDuration = localStorage.getItem('subscriptionDuration');
      const savedPrime = localStorage.getItem('primeAutoconsommation');
      const savedRemise = localStorage.getItem('remiseCommerciale');
      
      // Mettre à jour les paramètres financiers
      if (savedFinancialMode) {
        parameters.financingMode = savedFinancialMode as 'cash' | 'subscription';
      }
      if (savedDuration) {
        parameters.dureeAbonnement = parseInt(savedDuration, 10);
      }
      if (savedPrime) {
        parameters.primeAutoconsommation = parseFloat(savedPrime);
      }
      if (savedRemise) {
        parameters.remiseCommerciale = parseFloat(savedRemise);
      }

      calculateProjection(productionAnnuelle, puissanceCrete);
    }
  }, [calculateProjection, parameters]);

  const handlePDLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 14);
    setPdl(value);
  };

  // Get production data from localStorage
  const productionData = localStorage.getItem('solarResults') 
    ? JSON.parse(localStorage.getItem('solarResults')!)
    : null;

  // Prepare complete client info including address
  const completeClientInfo = {
    civilite: civilite,
    nom: clientInfo.nom,
    prenom: clientInfo.prenom,
    adresse: address.rue || '',
    codePostal: address.codePostal || '',
    ville: address.ville || '',
    region: address.region || '',
    telephone: telephoneClient,
    email: emailClient,
    pdl: pdl,
    date: formatDate(new Date()),
    ensoleillement: `${getSunshineHours(address.codePostal?.substring(0, 2) || '75')} kWh/m²/an`,
    conseiller: conseiller,
    telephoneConseiller: telephoneConseiller,
    commentaire: commentaire,
    coordinates: address.coordinates
  };

  // Prepare installation info
  const installationInfo = {
    typeCompteur: params.typeCompteur === 'monophase' ? 'Monophasé' : 'Triphasé',
    consommationAnnuelle: params.consommationAnnuelle,
    orientation: params.orientation,
    inclinaison: params.inclinaison,
    masqueSolaire: params.masqueSolaire,
    puissanceCrete: productionData?.puissanceCrete || 0,
    degradationPanneau: parameters.degradationPanneau || -0.2,
    nombreModules: params.nombreModules,
    pertes: params.pertes
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          to="/projection"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour à la projection financière
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Rapport détaillé
        </h2>

        <div className="space-y-6">
          {/* Informations client et conseiller */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations client</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Nom complet</dt>
                  <dd className="text-sm text-gray-900">{`${clientInfo.civilite} ${clientInfo.prenom} ${clientInfo.nom}`}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Téléphone</dt>
                  <dd className="text-sm text-gray-900">{clientInfo.telephone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Email</dt>
                  <dd className="text-sm text-gray-900">{clientInfo.email || '-'}</dd>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adresse du projet</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Rue</dt>
                  <dd className="text-sm text-gray-900">{address.rue || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Ville</dt>
                  <dd className="text-sm text-gray-900">{address.ville || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Code postal</dt>
                  <dd className="text-sm text-gray-900">{address.codePostal || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Région</dt>
                  <dd className="text-sm text-gray-900">{address.region || '-'}</dd>
                </div>
              </div>
            </div>
          </div>

          {/* Informations complémentaires */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations complémentaires</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Civilité
                </label>
                <select
                  value={civilite}
                  onChange={(e) => setCivilite(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="Monsieur">Monsieur</option>
                  <option value="Madame">Madame</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone client
                </label>
                <input
                  type="tel"
                  value={telephoneClient}
                  onChange={(e) => setTelephoneClient(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email client
                </label>
                <input
                  type="email"
                  value={emailClient}
                  onChange={(e) => setEmailClient(e.target.value)}
                  placeholder="client@exemple.fr"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Numéro PDL
                    </label>
                    <div className="relative group">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-sm rounded-lg py-2 px-3 w-72 bottom-full left-1/2 -translate-x-1/2 mb-2">
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        Le numéro PDL (Point De Livraison) est un identifiant unique de 14 chiffres qui se trouve sur votre facture d'électricité.
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={pdl}
                    onChange={handlePDLChange}
                    placeholder="14 chiffres"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    maxLength={14}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du conseiller
                  </label>
                  <input
                    type="text"
                    value={conseiller}
                    onChange={(e) => setConseiller(e.target.value)}
                    placeholder="Prénom et nom"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone conseiller
                  </label>
                  <input
                    type="text"
                    value={telephoneConseiller}
                    onChange={(e) => setTelephoneConseiller(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire pour le rapport
              </label>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ajoutez des informations complémentaires à inclure dans le rapport PDF..."
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Ces informations seront ajoutées au rapport PDF généré
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Générer un rapport PDF
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6 flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  Générez un rapport PDF personnalisé contenant toutes les informations de votre projet solaire.
                  Ce document peut être partagé avec votre installateur ou conservé pour référence.
                </p>
                {addressError && (
                  <p className="text-sm text-red-600 mt-2">
                    {addressError}
                  </p>
                )}
              </div>
            </div>
            
            <PdfReportGenerator 
              clientInfo={completeClientInfo}
              installation={installationInfo}
              templateUrl={PDF_TEMPLATE_URL}
              projection={projection}
              disabled={!!addressError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
