import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Loader2, CheckCircle, AlertCircle, Calendar, Zap, FileText, Sun } from 'lucide-react';
import { Ask, OrderResponse } from '../../types/switchgrid';
import { useSwitchgrid } from '../../hooks/useSwitchgrid';
import { switchgridApi } from '../../utils/api/switchgridApi';
import AnnualConsumptionChart from '../AnnualConsumptionChart';
import DailyAveragePowerCurve from '../DailyAveragePowerCurve';
import ContractDetailsDisplay from './ContractDetailsDisplay';
import LoadCurveSection from './LoadCurveSection';
import MaxPowerChart from '../MaxPowerChart';
import { createR65Order, formatR65Stats, fetchR65DataFromUrl } from '../../utils/api/switchgridR65Api';
import { createR65InjectionOrder } from '../../utils/api/switchgridR65InjectionApi';
import { createR66Order } from '../../utils/api/switchgridR66Api';
import { createC68Order } from '../../utils/api/switchgridC68Api';
import { createLoadCurveOrder } from '../../utils/api/switchgridLoadCurveApi';
import { createR63SyncOrder } from '../../utils/api/switchgridR63SyncApi';
import { mapR65ToDailyRows, R65DailyRow } from '../../utils/api/r65Parser';

interface DataRetrievalProps {
  ask: Ask;
  onBack: () => void;
}

export default function DataRetrieval({ ask, onBack }: DataRetrievalProps) {
  const {
    loading,
    error,
    currentOrder,
    createOrder,
    checkOrderStatus,
    getRequestData,
    saveOrderData,
    setError
  } = useSwitchgrid();

  const [retrievedData, setRetrievedData] = useState<{
    consumption?: any[];
    production?: any[];
    loadCurve?: any[];
    contractDetails?: any;
    maxPower?: any[];
  }>({});
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30min');
  const [loadCurveRequestId, setLoadCurveRequestId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [r65RequestId, setR65RequestId] = useState<string | null>(null);
  const [r65DataUrl, setR65DataUrl] = useState<string | null>(null);
  const [r65Loading, setR65Loading] = useState(false);
  const [r65OrderId, setR65OrderId] = useState<string | null>(null);
  const [r65PollingInterval, setR65PollingInterval] = useState<NodeJS.Timeout | null>(null);

  // States for R65 Annual Consumption (no Supabase)
  const [r65AnnualLoading, setR65AnnualLoading] = useState(false);
  const [r65AnnualData, setR65AnnualData] = useState<R65DailyRow[] | null>(null);
  const [r65AnnualCount, setR65AnnualCount] = useState<number | null>(null);
  const [r65AnnualRequestId, setR65AnnualRequestId] = useState<string | null>(null);
  const [r65AnnualSince, setR65AnnualSince] = useState<string | null>(null);
  const [r65AnnualUntil, setR65AnnualUntil] = useState<string | null>(null);

  // States for R65 INJECTION (Production)
  const [r65InjectionLoading, setR65InjectionLoading] = useState(false);
  const [r65InjectionData, setR65InjectionData] = useState<R65DailyRow[] | null>(null);
  const [r65InjectionCount, setR65InjectionCount] = useState<number | null>(null);

  // States for R66 (Max Power)
  const [r66Loading, setR66Loading] = useState(false);
  const [r66Data, setR66Data] = useState<any[] | null>(null);
  const [r66Count, setR66Count] = useState<number | null>(null);

  // States for LOADCURVE (Load Curve)
  const [loadCurveLoading, setLoadCurveLoading] = useState(false);
  const [loadCurveData, setLoadCurveData] = useState<any[] | null>(null);
  const [loadCurveCount, setLoadCurveCount] = useState<number | null>(null);
  const [loadCurveOrderId, setLoadCurveOrderId] = useState<string | null>(null);
  const [loadCurveOrderStatus, setLoadCurveOrderStatus] = useState<string | null>(null);
  const [loadCurveRequestIdFromOrder, setLoadCurveRequestIdFromOrder] = useState<string | null>(null);
  const [loadCurveSince, setLoadCurveSince] = useState<string>('');
  const [loadCurveUntil, setLoadCurveUntil] = useState<string>('');
  const [loadCurvePeriod, setLoadCurvePeriod] = useState<string>('30min');

  // States for Meter Type (Type de compteur)
  const [meterTypeLoading, setMeterTypeLoading] = useState(false);
  const [meterPhaseType, setMeterPhaseType] = useState<string | null>(null);
  const [meterDebugRequest, setMeterDebugRequest] = useState<any>(null);
  const [meterDebugResponse, setMeterDebugResponse] = useState<any>(null);

  // States for R63_SYNC (7-day load curve)
  const [r63SyncLoading, setR63SyncLoading] = useState(false);
  const [r63SyncData, setR63SyncData] = useState<any[] | null>(null);
  const [r63SyncCount, setR63SyncCount] = useState<number | null>(null);

  // États pour les requêtes individuelles
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, {
    id?: string;
    status: string;
    dataUrl?: string;
  }>>({});
  const [dataFetched, setDataFetched] = useState<Record<string, boolean>>({});

  // Initialize default dates for LOADCURVE (last 365 days)
  useEffect(() => {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 365);

    setLoadCurveUntil(endDate.toISOString().split('T')[0]);
    setLoadCurveSince(startDate.toISOString().split('T')[0]);
  }, []);

  // Nettoyer l'intervalle de polling au démontage
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (r65PollingInterval) {
        clearInterval(r65PollingInterval);
      }
    };
  }, [pollingInterval, r65PollingInterval]);

  const toggleRequestSelection = (requestType: string) => {
    setSelectedRequests(prev => {
      // Si on veut décocher, autoriser
      if (prev.includes(requestType)) {
        return prev.filter(t => t !== requestType);
      }

      // Si on coche C68, retirer R65_SYNC
      if (requestType === 'C68' || requestType === 'C68_ASYNC') {
        return [...prev.filter(t => t !== 'R65_SYNC'), requestType];
      }

      // Si on coche R65_SYNC, retirer C68
      if (requestType === 'R65_SYNC') {
        return [...prev.filter(t => t !== 'C68' && t !== 'C68_ASYNC'), requestType];
      }

      // Pour les autres types, comportement normal
      return [...prev, requestType];
    });
  };

  const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/switchgrid-orders`;

  async function callEdge<T>(payload: any): Promise<T> {
    const r = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Edge ${r.status}: ${txt}`);
    }
    return r.json();
  }

  const handleR65AnnualFlow = async (prm: string, consentId: string) => {
    console.log('📊 Starting R65 annual flow with switchgrid_r65_soutirage');
    setR65AnnualLoading(true);
    setR65AnnualData(null);
    setR65AnnualCount(null);
    setError(null);

    try {
      console.log('📤 Creating R65 order with returnRows=true...');

      // Calculer les dates (365 derniers jours)
      const now = new Date();
      const endDate = new Date(now); // Aujourd'hui
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 365); // 365 jours en arrière

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const result = await createR65Order({
        prm,
        consent_id: consentId,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        returnRows: true // ← Obtenir directement les rows parsées
      });

      console.log('✅ R65 response:', result);

      if (result.rows && result.rows.length > 0) {
        console.log(`✅ Received ${result.rows.length} rows directly from Edge Function`);

        const chartData = result.rows.map(r => ({
          date: r.date,
          energy_total_kwh: r.energy_total_kwh
        }));

        const count = chartData.length;
        setR65AnnualCount(count);
        setR65AnnualData(chartData as any);
        setR65AnnualSince(formatDate(startDate));
        setR65AnnualUntil(formatDate(endDate));

        setSuccessMessage(`✅ Import R65 OK — ${count} enregistrements (${formatDate(startDate)} → ${formatDate(endDate)})`);

        setDataFetched(prev => ({ ...prev, 'R65_SYNC': true }));
        setRequestStatuses(prev => ({
          ...prev,
          'R65_SYNC': {
            id: 'r65-request',
            status: 'SUCCESS',
            dataUrl: undefined
          }
        }));
      } else {
        throw new Error('Aucune donnée reçue de l\'Edge Function');
      }

      setR65AnnualLoading(false);
    } catch (err: any) {
      console.error('❌ Error in R65 flow:', err);
      setError(err.message || 'Failed R65 flow');
      setR65AnnualLoading(false);
    }
  };

  const handleR65InjectionFlow = async (prm: string, consentId: string) => {
    console.log('📊 Starting R65 INJECTION flow');
    setR65InjectionLoading(true);
    setR65InjectionData(null);
    setR65InjectionCount(null);
    setError(null);

    try {
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 365);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const result = await createR65InjectionOrder({
        prm,
        consent_id: consentId,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        returnRows: true
      });

      console.log('✅ R65 INJECTION response:', result);

      if (result.rows && result.rows.length > 0) {
        const chartData = result.rows.map(r => ({
          date: r.date,
          energy_total_kwh: r.energy_total_kwh
        }));

        setR65InjectionCount(chartData.length);
        setR65InjectionData(chartData as any);
        setSuccessMessage(`✅ Import INJECTION OK — ${chartData.length} enregistrements (${formatDate(startDate)} → ${formatDate(endDate)})`);

        setDataFetched(prev => ({ ...prev, 'R65_PRODUCTION': true }));
        setRequestStatuses(prev => ({
          ...prev,
          'R65_PRODUCTION': {
            id: 'r65-injection-request',
            status: 'SUCCESS',
            dataUrl: undefined
          }
        }));
      } else {
        throw new Error('Aucune donnée d\'injection reçue');
      }

      setR65InjectionLoading(false);
    } catch (err: any) {
      console.error('❌ Error in R65 INJECTION flow:', err);
      setError(err.message || 'Failed R65 INJECTION flow');
      setR65InjectionLoading(false);
    }
  };

  const handleR66Flow = async (prm: string, consentId: string) => {
    console.log('📊 Starting R66 flow');
    setR66Loading(true);
    setR66Data(null);
    setR66Count(null);
    setError(null);

    try {
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 365);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const result = await createR66Order({
        prm,
        consent_id: consentId,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        returnRows: true
      });

      console.log('✅ R66 response:', result);

      if (result.rows && result.rows.length > 0) {
        setR66Data(result.rows);
        setR66Count(result.rows.length);
        setSuccessMessage(`✅ Import R66 OK — ${result.rows.length} enregistrements (${formatDate(startDate)} → ${formatDate(endDate)})`);

        setDataFetched(prev => ({ ...prev, 'R66_SYNC': true }));
        setRequestStatuses(prev => ({
          ...prev,
          'R66_SYNC': {
            id: 'r66-request',
            status: 'SUCCESS',
            dataUrl: undefined
          }
        }));
      } else {
        throw new Error('Aucune donnée R66 reçue');
      }

      setR66Loading(false);
    } catch (err: any) {
      console.error('❌ Error in R66 flow:', err);
      setError(err.message || 'Failed R66 flow');
      setR66Loading(false);
    }
  };

  const handleR63SyncFlow = async (prm: string, consentId: string) => {
    console.log('📊 Starting R63_SYNC flow (7 derniers jours)');
    console.log(`📊 Selected period: ${selectedPeriod}`);
    setR63SyncLoading(true);
    setR63SyncData(null);
    setR63SyncCount(null);
    setError(null);

    try {
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const result = await createR63SyncOrder(
        prm,
        consentId,
        formatDate(startDate),
        formatDate(endDate),
        selectedPeriod
      );

      console.log('✅ R63_SYNC response:', result);
      console.log('📦 RAW DATA FROM SWITCHGRID:', JSON.stringify(result.rawData, null, 2));

      // Pour l'instant, afficher un message avec le rawData
      setSuccessMessage(`✅ Données R63_SYNC reçues - Voir console pour structure`);
      alert(`📦 Raw Data Structure:\n\n${JSON.stringify(result.rawData, null, 2)}`);

      setDataFetched(prev => ({ ...prev, 'R63_SYNC': true }));
      setRequestStatuses(prev => ({
        ...prev,
        'R63_SYNC': {
          id: 'r63-sync-request',
          status: 'SUCCESS',
          dataUrl: undefined
        }
      }));

      setR63SyncLoading(false);
    } catch (err: any) {
      console.error('❌ Error in R63_SYNC flow:', err);
      setError(err.message || 'Failed R63_SYNC flow');
      setR63SyncLoading(false);
    }
  };

  // LOADCURVE FLOW: Step 1 - Create Order using dedicated function
  const handleLoadCurveFlow = async (prm: string, consentId: string) => {
    console.log('📊 Starting LOADCURVE flow - POST /Order');
    console.log('📊 ConsentId (UUID):', consentId);
    console.log('📊 Type: LOADCURVE');
    console.log('📊 Direction: CONSUMPTION');

    setLoadCurveLoading(true);
    setLoadCurveData(null);
    setLoadCurveCount(null);
    setLoadCurveOrderId(null);
    setLoadCurveOrderStatus(null);
    setLoadCurveRequestIdFromOrder(null);
    setError(null);

    try {
      // Use dedicated createLoadCurveOrder function
      const order = await switchgridApi.createLoadCurveOrder(consentId);

      console.log('✅ LOADCURVE Order Response:', order);

      // Extract orderId, requestId (from id in response), and status
      const orderId = order.id;
      const requestId = order.requests?.[0]?.id || null;
      const status = order.status;

      console.log('📋 Extracted values:');
      console.log('  - OrderId:', orderId);
      console.log('  - RequestId:', requestId);
      console.log('  - Status:', status);

      setLoadCurveOrderId(orderId);
      setLoadCurveRequestIdFromOrder(requestId);
      setLoadCurveOrderStatus(status);

      setSuccessMessage(`✅ Commande LOADCURVE créée avec succès`);

      setDataFetched(prev => ({ ...prev, 'LOADCURVE': false }));
      setRequestStatuses(prev => ({
        ...prev,
        'LOADCURVE': {
          id: requestId || 'pending',
          status: status,
          dataUrl: undefined
        }
      }));

      setLoadCurveLoading(false);
    } catch (err: any) {
      console.error('❌ Error creating LOADCURVE order:', err);
      setError(err.message || 'Échec de la création de la commande LOADCURVE');
      setLoadCurveLoading(false);
    }
  };

  // METER TYPE HANDLER - Fonction pour le bouton "Type de compteur"
  const handleMeterTypeClick = async () => {
    console.log('🔌 METER TYPE BUTTON CLICKED');

    setMeterTypeLoading(true);
    setMeterPhaseType(null);
    setMeterDebugRequest(null);
    setMeterDebugResponse(null);
    setError(null);

    try {
      // Get contractId from ask
      const contractId = ask.contracts[0]?.id;
      if (!contractId) {
        throw new Error('Contract ID non trouvé');
      }

      console.log('🔌 Using Contract ID:', contractId);

      // Prepare debug request data
      const debugRequest = {
        method: 'GET',
        url: `https://app.switchgrid.tech/enedis/v2/contract/${contractId}/details`,
        contractId: contractId
      };

      // Store debug request
      setMeterDebugRequest(debugRequest);

      // Call the API
      const contractDetails = await switchgridApi.getContractDetails(contractId);

      console.log('✅ Contract Details Response:', contractDetails);

      // Store debug response (full response)
      setMeterDebugResponse(contractDetails);

      // Extract phase type
      const phaseType = contractDetails.meters?.[0]?.phaseType || null;

      console.log('📋 Extracted Phase Type:', phaseType);

      // Store in state
      setMeterPhaseType(phaseType);

      setSuccessMessage(`✅ Type de compteur récupéré avec succès`);
      setMeterTypeLoading(false);
    } catch (err: any) {
      console.error('❌ Error getting meter type:', err);
      setError(err.message || 'Échec de la récupération du type de compteur');
      setMeterDebugResponse({ error: err.message || 'Unknown error', details: err });
      setMeterTypeLoading(false);
    }
  };

  // DATA BUTTON HANDLER - Nouvelle fonction pour le bouton "Data"
  const handleDataButtonClick = async () => {
    console.log('📊 DATA BUTTON CLICKED - Creating LOADCURVE order');

    setDataOrderLoading(true);
    setDataOrderId(null);
    setDataOrderStatus(null);
    setDataRequestId(null);
    setDataDebugRequest(null);
    setDataDebugResponse(null);
    setError(null);

    try {
      // Get consentId from ask
      const consentId = Object.values(ask.consentIds)[0];
      if (!consentId) {
        throw new Error('Consent ID non trouvé');
      }

      console.log('📊 Using ConsentId:', consentId);
      console.log('📊 Type: LOADCURVE');
      console.log('📊 Direction: CONSUMPTION');

      // Prepare debug request data
      const debugRequest = {
        consentId: consentId,
        requests: [
          {
            type: 'LOADCURVE',
            direction: 'CONSUMPTION',
            enedisRetryAfterLoadcurveActivation: true
          }
        ]
      };

      // Store debug request
      setDataDebugRequest(debugRequest);

      // Call the new dedicated function
      const order = await switchgridApi.createLoadCurveDataOrder(consentId);

      console.log('✅ Data Order Response:', order);

      // Store debug response (full response)
      setDataDebugResponse(order);

      // Extract the 3 values
      const orderId = order.id;
      const requestId = order.requests?.[0]?.id || null;
      const status = order.status;

      console.log('📋 Extracted values:');
      console.log('  - Order ID:', orderId);
      console.log('  - Request ID:', requestId);
      console.log('  - Status:', status);

      // Store in state
      setDataOrderId(orderId);
      setDataRequestId(requestId);
      setDataOrderStatus(status);

      setSuccessMessage(`✅ Commande Data créée avec succès`);
      setDataOrderLoading(false);
    } catch (err: any) {
      console.error('❌ Error creating Data order:', err);
      setError(err.message || 'Échec de la création de la commande Data');
      setDataDebugResponse({ error: err.message || 'Unknown error', details: err });
      setDataOrderLoading(false);
    }
  };

  // LOADCURVE FLOW: Step 2 - Refresh Order Status (Direct API)
  const handleRefreshLoadCurveStatus = async () => {
    if (!loadCurveOrderId) {
      setError('Aucun Order ID disponible');
      return;
    }

    console.log('🔄 Refreshing Order Status via direct API:', loadCurveOrderId);
    setLoadCurveLoading(true);

    try {
      const order = await switchgridApi.getOrder(loadCurveOrderId);

      console.log('✅ Order status refreshed:', order);

      const status = order.status;
      const requestId = order.requests?.[0]?.id || loadCurveRequestIdFromOrder;

      setLoadCurveOrderStatus(status);
      setLoadCurveRequestIdFromOrder(requestId);

      setRequestStatuses(prev => ({
        ...prev,
        'LOADCURVE': {
          id: requestId || 'pending',
          status: status,
          dataUrl: undefined
        }
      }));

      setSuccessMessage(`✅ Statut mis à jour: ${status}`);
      setLoadCurveLoading(false);
    } catch (err: any) {
      console.error('❌ Error refreshing status:', err);
      setError(err.message || 'Failed to refresh order status');
      setLoadCurveLoading(false);
    }
  };

  // LOADCURVE FLOW: Step 3 - Download Data (Direct API)
  const handleDownloadLoadCurve = async () => {
    if (!loadCurveRequestIdFromOrder) {
      setError('Aucun Request ID disponible');
      return;
    }

    if (loadCurveOrderStatus !== 'SUCCESS') {
      setError('La commande doit être au statut SUCCESS pour télécharger');
      return;
    }

    if (!loadCurveSince || !loadCurveUntil) {
      setError('Veuillez spécifier les dates de début et fin');
      return;
    }

    console.log('📥 Downloading LOADCURVE data via direct API:', {
      requestId: loadCurveRequestIdFromOrder,
      period: loadCurvePeriod,
      since: loadCurveSince,
      until: loadCurveUntil
    });

    setLoadCurveLoading(true);
    setError(null);

    try {
      const data = await switchgridApi.getRequestData(
        loadCurveRequestIdFromOrder,
        {
          period: loadCurvePeriod,
          format: 'json',
          since: loadCurveSince,
          until: loadCurveUntil
        }
      );

      console.log('✅ LOADCURVE data received:', data);

      // Parse the data
      if (data && Array.isArray(data)) {
        setLoadCurveData(data);
        setLoadCurveCount(data.length);
        setSuccessMessage(`✅ Données téléchargées - ${data.length} points`);
        setDataFetched(prev => ({ ...prev, 'LOADCURVE': true }));
      } else {
        throw new Error('Format de données inattendu');
      }

      setLoadCurveLoading(false);
    } catch (err: any) {
      console.error('❌ Error downloading data:', err);
      setError(err.message || 'Failed to download LOADCURVE data');
      setLoadCurveLoading(false);
    }
  };

  const handleOrderSelectedData = async () => {
    if (selectedRequests.length === 0) {
      setError('Veuillez sélectionner au moins un type de données');
      return;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      const prm = ask.contracts[0]?.prm;
      if (!prm) {
        throw new Error('PRM non trouvé dans le contrat');
      }

      const consentId = Object.values(ask.consentIds)[0];
      if (!consentId) {
        throw new Error('Consent ID non trouvé');
      }

      // NOUVEAU: Utiliser les flux dédiés pour R65_SYNC, R65_PRODUCTION, R66_SYNC, LOADCURVE
      if (selectedRequests.length === 1 && selectedRequests[0] === 'R65_SYNC') {
        await handleR65AnnualFlow(prm, consentId);
        return;
      }

      if (selectedRequests.length === 1 && selectedRequests[0] === 'R65_PRODUCTION') {
        await handleR65InjectionFlow(prm, consentId);
        return;
      }

      if (selectedRequests.length === 1 && selectedRequests[0] === 'R66_SYNC') {
        await handleR66Flow(prm, consentId);
        return;
      }

      if (selectedRequests.length === 1 && selectedRequests[0] === 'LOADCURVE') {
        await handleLoadCurveFlow(prm, consentId);
        return;
      }

      if (selectedRequests.length === 1 && selectedRequests[0] === 'R63_SYNC') {
        await handleR63SyncFlow(prm, consentId);
        return;
      }

      // Sinon, utiliser l'ancienne méthode multi-requêtes
      const requestsToOrder: any[] = [];

      if (selectedRequests.includes('C68')) {
        requestsToOrder.push({
          type: 'C68' as const,
          prms: [prm]
        });
      }

      if (selectedRequests.includes('R65_SYNC')) {
        requestsToOrder.push({
          type: 'R65_SYNC' as const,
          direction: 'SOUTIRAGE' as const,
          since: formatDate(startDate),
          until: formatDate(endDate),
          prms: [prm]
        });
      }

      if (selectedRequests.includes('R65_PRODUCTION')) {
        requestsToOrder.push({
          type: 'R65_SYNC' as const,
          direction: 'INJECTION' as const,
          since: formatDate(startDate),
          until: formatDate(endDate),
          prms: [prm]
        });
      }

      if (selectedRequests.includes('R66_SYNC')) {
        requestsToOrder.push({
          type: 'R66_SYNC' as const,
          direction: 'SOUTIRAGE' as const,
          since: formatDate(startDate),
          until: formatDate(endDate),
          prms: [prm]
        });
      }

      if (selectedRequests.includes('LOADCURVE')) {
        requestsToOrder.push({
          type: 'LOADCURVE' as const,
          direction: 'CONSUMPTION' as const,
          since: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          until: formatDate(endDate),
          prms: [prm]
        });
      }

      const orderRequest = {
        consentId: consentId,
        requests: requestsToOrder
      };

      console.log('📊 Commande de données sélectionnées:', orderRequest);
      const order = await createOrder(orderRequest);

      console.log('📦 ORDER COMPLET REÇU:', JSON.stringify(order, null, 2));
      console.log('📊 REQUESTS DANS ORDER:', order.requests.map((r: any) => ({
        type: r.type,
        status: r.status,
        hasDataUrl: !!r.dataUrl,
        dataUrl: r.dataUrl
      })));

      // Mettre à jour les statuts des requêtes
      const newStatuses: Record<string, any> = {};
      order.requests.forEach((req: any) => {
        // Créer une clé unique basée sur le type ET la direction
        let statusKey = req.type;
        if (req.type === 'R65_SYNC' && req.direction === 'INJECTION') {
          statusKey = 'R65_PRODUCTION';
        }

        newStatuses[statusKey] = {
          id: req.id,
          status: req.status,
          dataUrl: req.dataUrl,
          direction: req.direction
        };
      });
      setRequestStatuses(prev => ({ ...prev, ...newStatuses }));

      // Vérifier si toutes les requêtes sont terminées (SUCCESS ou FAILED)
      const allRequestsCompleted = order.requests.every(
        (req: any) => req.status === 'SUCCESS' || req.status === 'FAILED'
      );

      if (!allRequestsCompleted) {
        // Si au moins une requête est en PENDING, démarrer le polling
        console.log('⏳ Des requêtes sont encore en cours, démarrage du polling...');
        startOrderPolling(order.id, prm);
      } else {
        // Toutes les requêtes sont terminées, traiter les données
        console.log('✅ Toutes les requêtes sont terminées, traitement des données...');
        await processOrderData(order, prm);
      }
    } catch (err: any) {
      console.error('Erreur lors de la commande:', err);
      setError(err?.message || 'Échec création commande: Edge Function returned a non-2xx status code');
      setIsPolling(false);
    }
  };

  const startOrderPolling = (orderId: string, prm: string) => {
    setIsPolling(true);

    const interval = setInterval(async () => {
      try {
        const updatedOrder = await checkOrderStatus(orderId);

        // Mettre à jour les statuts des requêtes
        const newStatuses: Record<string, any> = {};
        updatedOrder.requests.forEach((req: any) => {
          // Créer une clé unique basée sur le type ET la direction
          let statusKey = req.type;
          if (req.type === 'R65_SYNC' && req.direction === 'INJECTION') {
            statusKey = 'R65_PRODUCTION';
          }

          newStatuses[statusKey] = {
            id: req.id,
            status: req.status,
            dataUrl: req.dataUrl,
            direction: req.direction
          };
        });
        setRequestStatuses(prev => ({ ...prev, ...newStatuses }));

        // Vérifier si toutes les requêtes sont terminées
        const allRequestsCompleted = updatedOrder.requests.every(
          (req: any) => req.status === 'SUCCESS' || req.status === 'FAILED'
        );

        if (allRequestsCompleted) {
          clearInterval(interval);
          setIsPolling(false);
          setPollingInterval(null);

          const hasFailures = updatedOrder.requests.some((req: any) => req.status === 'FAILED');
          if (hasFailures) {
            setError('Certaines requêtes ont échoué. Données partielles disponibles.');
          }

          console.log('✅ Polling terminé, traitement des données...');
          await processOrderData(updatedOrder, prm);
        } else {
          console.log('⏳ Polling en cours, requêtes encore en attente...');
        }
      } catch (err) {
        console.error('Erreur lors de la vérification de la commande:', err);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  // Helper pour récupérer les données avec retry
  const fetchRequestDataWithRetry = async (
    requestId: string,
    requestType: string,
    params: any,
    maxRetries = 3,
    delayMs = 2000
  ): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentative ${attempt}/${maxRetries} pour récupérer les données ${requestType}...`);
        const data = await getRequestData(requestId, requestType, params);
        console.log(`✅ Données récupérées avec succès à la tentative ${attempt}`);
        return data;
      } catch (error: any) {
        console.warn(`⚠️ Tentative ${attempt}/${maxRetries} échouée:`, error.message);

        if (attempt < maxRetries) {
          const waitTime = delayMs * attempt; // Délai progressif
          console.log(`⏳ Attente de ${waitTime}ms avant nouvelle tentative...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error(`❌ Échec après ${maxRetries} tentatives`);
          throw error;
        }
      }
    }
  };

  const processOrderData = async (order: OrderResponse, prm: string) => {
    const data: any = {};

    try {
      for (const request of order.requests) {
        if (request.status === 'SUCCESS' && request.dataUrl) {
          console.log(`📈 Récupération données ${request.type}:`, request.id);
          console.log(`🔗 DataUrl fourni par l'API:`, request.dataUrl);

          try {
            // Store the load curve request ID for later download
            if (request.type === 'LOADCURVE') {
              setLoadCurveRequestId(request.id);
            }

            let requestData;

            // Pour C68, utiliser le dataUrl fourni par l'API via l'edge function (pour éviter CORS)
            if ((request.type === 'C68' || request.type === 'C68_ASYNC') && request.dataUrl) {
              console.log(`🌐 Utilisation du dataUrl pour C68: ${request.dataUrl}`);

              try {
                // Passer par l'edge function pour éviter les problèmes CORS avec Google Cloud Storage
                const response = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/switchgrid-orders`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                      action: 'fetch_url',
                      url: request.dataUrl
                    })
                  }
                );

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                requestData = await response.json();
                console.log(`✅ Données C68 récupérées via dataUrl (proxifié)`);
              } catch (fetchError: any) {
                console.error(`❌ Erreur fetch dataUrl:`, fetchError.message);
                throw fetchError;
              }
            } else {
              // Pour les autres types, utiliser la méthode normale
              const params: any = { format: 'json' };
              requestData = await fetchRequestDataWithRetry(request.id, request.type, params);
            }

            console.log(`📦 Full raw data for ${request.type}:`, requestData);
            console.log(`📊 Data structure analysis:`, {
              type: typeof requestData,
              isArray: Array.isArray(requestData),
              keys: requestData ? Object.keys(requestData) : [],
              hasResults: requestData?.results !== undefined,
              hasData: requestData?.data !== undefined,
              resultsIsArray: Array.isArray(requestData?.results),
              dataIsArray: Array.isArray(requestData?.data)
            });

            switch (request.type) {
              case 'C68':
              case 'C68_ASYNC':
                data.contractDetails = requestData;
                setDataFetched(prev => ({ ...prev, 'C68': true }));
                break;
              case 'R65_SYNC':
                // Extract array from response object
                let r65Array = requestData;
                if (!Array.isArray(requestData)) {
                  // Try common API response structures
                  r65Array = requestData?.results || requestData?.data || requestData?.items || [];
                  console.log('📦 Extracted R65 array from:', Object.keys(requestData)[0], 'Length:', r65Array?.length);
                }

                if (Array.isArray(r65Array) && r65Array.length > 0) {
                  console.log('📦 Sample R65 item:', r65Array[0]);
                  const mappedData = r65Array.map((item: any) => ({
                    date: item.date || item.jour || item.day,
                    peak_hours: item.peak_hours || item.hph || item.hp || 0,
                    off_peak_hours: item.off_peak_hours || item.hch || item.hc || 0,
                    total: (item.peak_hours || item.hph || item.hp || 0) + (item.off_peak_hours || item.hch || item.hc || 0)
                  }));

                  // Différencier selon la direction
                  if (request.direction === 'INJECTION') {
                    data.production = mappedData;
                    setDataFetched(prev => ({ ...prev, 'R65_PRODUCTION': true }));
                    console.log('✅ Données de PRODUCTION sauvegardées');
                  } else {
                    data.consumption = mappedData;
                    setDataFetched(prev => ({ ...prev, 'R65_SYNC': true }));
                    console.log('✅ Données de CONSOMMATION sauvegardées');
                  }
                } else {
                  console.warn('❌ Could not extract array from R65_SYNC data');
                  if (request.direction === 'INJECTION') {
                    data.production = [];
                  } else {
                    data.consumption = [];
                  }
                }
                break;
              case 'LOADCURVE':
                data.loadCurve = requestData;
                setDataFetched(prev => ({ ...prev, 'LOADCURVE': true }));
                break;
              case 'R66_SYNC':
                // Extract array from response object
                let maxPowerArray = requestData;
                if (!Array.isArray(requestData)) {
                  maxPowerArray = requestData?.results || requestData?.data || requestData?.items || [];
                  console.log('📦 Extracted maxPower array from:', Object.keys(requestData)[0], 'Length:', maxPowerArray?.length);
                }

                if (Array.isArray(maxPowerArray) && maxPowerArray.length > 0) {
                  console.log('📦 Sample maxPower item:', maxPowerArray[0]);
                  data.maxPower = maxPowerArray.map((item: any) => ({
                    date: item.date || item.jour || item.day,
                    max_power: item.max_power || item.pmax || item.puissance_max || 0
                  }));
                } else {
                  data.maxPower = [];
                  console.warn('❌ Could not extract array from R66_SYNC data');
                }
                setDataFetched(prev => ({ ...prev, 'R66_SYNC': true }));
                break;
            }
          } catch (requestError) {
            console.warn(`⚠️ Erreur récupération ${request.type}:`, requestError);
          }
        }
      }

      setRetrievedData(data);
      console.log('✅ Données traitées:', Object.keys(data));

      // Sauvegarder les données dans Supabase
      try {
        const prm = ask.contracts[0]?.prm;
        if (prm && Object.keys(data).length > 0) {
          console.log('💾 Début sauvegarde dans Supabase...');
          const saveResult = await saveOrderData(prm, order, data);
          console.log('✅ Sauvegarde réussie:', saveResult.stats);
        }
      } catch (saveError) {
        console.warn('⚠️ Erreur lors de la sauvegarde:', saveError);
        // Ne pas bloquer l'affichage si la sauvegarde échoue
      }
    } catch (err) {
      console.error('❌ Erreur traitement données:', err);
      setError('Erreur lors du traitement des données');
    }
  };

  const handleDownloadRequestData = async (requestType: string) => {
    const requestStatus = requestStatuses[requestType];
    if (!requestStatus || !requestStatus.id) {
      setError(`ID de requête non disponible pour ${requestType}`);
      return;
    }

    // Vérifier que le statut est bien SUCCESS
    if (requestStatus.status !== 'SUCCESS') {
      setError(`La requête ${requestType} n'est pas encore terminée (statut: ${requestStatus.status})`);
      return;
    }

    try {
      console.log(`📥 Téléchargement données ${requestType}:`, {
        requestId: requestStatus.id,
        status: requestStatus.status,
        dataUrl: requestStatus.dataUrl,
        prm: ask.prm
      });

      const format = requestType === 'LOADCURVE' ? 'csv' : 'json';

      // Construire les paramètres selon le type de requête
      const params: any = { format };

      // Pour LOADCURVE, ajouter le period
      if (requestType === 'LOADCURVE') {
        params.period = selectedPeriod;
      }

      // Pour C68, ajouter le PRM (PDL)
      if (requestType === 'C68' || requestType === 'C68_ASYNC') {
        const prm = ask.contracts[0]?.prm;
        if (prm) {
          params.prm = prm;
        }
      }

      console.log(`📊 Params envoyés:`, params);

      const requestData = await getRequestData(requestStatus.id, requestType, params);

      let blob: Blob;
      let extension: string;

      if (format === 'csv') {
        blob = new Blob([requestData], { type: 'text/csv;charset=utf-8;' });
        extension = 'csv';
      } else {
        const jsonString = typeof requestData === 'string'
          ? requestData
          : JSON.stringify(requestData, null, 2);
        blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
        extension = 'json';
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${requestType}_${new Date().toISOString().split('T')[0]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Téléchargement réussi');
    } catch (err) {
      console.error('❌ Erreur téléchargement:', err);
      setError(`Erreur lors du téléchargement des données ${requestType}`);
    }
  };

  const handleDownloadR65 = async () => {
    setR65Loading(true);
    setError(null);
    setR65RequestId(null);
    setR65DataUrl(null);
    setR65OrderId(null);

    // Clear any existing polling interval
    if (r65PollingInterval) {
      clearInterval(r65PollingInterval);
      setR65PollingInterval(null);
    }

    try {
      const consentId = '334be8a8-a600-4d09-b0ec-ea034a5be41d';
      const prm = ask.contracts[0]?.prm;

      if (!prm) {
        throw new Error('PRM non trouvé dans le contrat');
      }

      console.log('🚀 Creating R65_SYNC order for PRM:', prm);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/switchgrid-orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            action: 'create_order',
            orderRequest: {
              consentId,
              requests: [{
                type: 'R65_SYNC',
                prms: [prm]
              }]
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const orderData = await response.json();
      console.log('📦 Order received:', orderData);

      setR65OrderId(orderData.id);

      // Find R65_SYNC request in the response
      const r65Request = orderData.requests?.find((r: any) => r.type === 'R65_SYNC');

      if (!r65Request) {
        throw new Error('R65_SYNC request not found in response');
      }

      setR65RequestId(r65Request.id);

      // If already SUCCESS with dataUrl, we're done
      if (r65Request.status === 'SUCCESS' && r65Request.dataUrl) {
        setR65DataUrl(r65Request.dataUrl);
        setSuccessMessage(`✅ R65 request completed! Request ID: ${r65Request.id}`);
        setR65Loading(false);
        return;
      }

      // Otherwise, start polling
      console.log('⏳ Request status:', r65Request.status, '- Starting polling...');
      setSuccessMessage(`⏳ R65 request created (ID: ${r65Request.id}). Waiting for completion...`);

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/switchgrid-orders`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                action: 'get_order',
                orderId: orderData.id
              })
            }
          );

          if (statusResponse.ok) {
            const updatedOrder = await statusResponse.json();
            const updatedR65Request = updatedOrder.requests?.find((r: any) => r.type === 'R65_SYNC');

            console.log('🔄 Polling status:', updatedR65Request?.status);

            if (updatedR65Request?.status === 'SUCCESS') {
              clearInterval(pollInterval);
              setR65PollingInterval(null);
              setR65DataUrl(updatedR65Request.dataUrl);
              setSuccessMessage(`✅ R65 request completed! Request ID: ${updatedR65Request.id}`);
              setR65Loading(false);
            } else if (updatedR65Request?.status === 'FAILED') {
              clearInterval(pollInterval);
              setR65PollingInterval(null);
              setError(`R65 request failed: ${updatedR65Request.errorMessage || 'Unknown error'}`);
              setR65Loading(false);
            }
          }
        } catch (pollErr) {
          console.error('❌ Error polling order status:', pollErr);
        }
      }, 3000); // Poll every 3 seconds

      setR65PollingInterval(pollInterval);

    } catch (err: any) {
      console.error('❌ Error creating R65 order:', err);
      setError(err.message || 'Failed to create R65 order');
      setR65Loading(false);
    }
  };

  const handleDownloadR65Data = async () => {
    if (!r65DataUrl) return;

    try {
      const response = await fetch(r65DataUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `R65_${r65RequestId}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ R65 data downloaded successfully');
    } catch (err: any) {
      console.error('❌ Error downloading R65 data:', err);
      setError(`Error downloading data: ${err.message}`);
    }
  };

  const handleDownloadDailyConsumption = async () => {
    setDailyConsumptionLoading(true);
    setError(null);
    setDailyConsumptionRequestId(null);
    setDailyConsumptionDataUrl(null);
    setDailyConsumptionOrderId(null);
    setDailyConsumptionMessage(null);

    // Clear any existing polling interval
    if (dailyConsumptionPollingInterval) {
      clearInterval(dailyConsumptionPollingInterval);
      setDailyConsumptionPollingInterval(null);
    }

    try {
      const consentId = '334be8a8-a600-4d09-b0ec-ea034a5be41d';
      const prm = ask.contracts[0]?.prm;

      if (!prm) {
        throw new Error('PRM non trouvé dans le contrat');
      }

      console.log('🚀 Creating R65 order with SOUTIRAGE direction for PRM:', prm);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/switchgrid-orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            action: 'create_order',
            orderRequest: {
              consentId,
              requests: [{
                type: 'R65',
                direction: 'SOUTIRAGE',
                prms: [prm]
              }]
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const orderData = await response.json();
      console.log('📦 Order received:', orderData);

      setDailyConsumptionOrderId(orderData.id);

      // Find R65 request in the response
      const r65Request = orderData.requests?.find((r: any) => r.type === 'R65');

      if (!r65Request) {
        throw new Error('R65 request not found in response');
      }

      setDailyConsumptionRequestId(r65Request.id);

      // If already SUCCESS with dataUrl, we're done
      if (r65Request.status === 'SUCCESS' && r65Request.dataUrl) {
        setDailyConsumptionDataUrl(r65Request.dataUrl);
        setDailyConsumptionMessage(`✅ Daily consumption data ready! Request ID: ${r65Request.id}`);
        setDailyConsumptionLoading(false);
        return;
      }

      // Otherwise, start polling
      console.log('⏳ Request status:', r65Request.status, '- Starting polling...');
      setDailyConsumptionMessage(`⏳ Request created (ID: ${r65Request.id}). Waiting for completion...`);

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/switchgrid-orders`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                action: 'get_order',
                orderId: orderData.id
              })
            }
          );

          if (statusResponse.ok) {
            const updatedOrder = await statusResponse.json();
            const updatedR65Request = updatedOrder.requests?.find((r: any) => r.type === 'R65');

            console.log('🔄 Polling status:', updatedR65Request?.status);

            if (updatedR65Request?.status === 'SUCCESS') {
              clearInterval(pollInterval);
              setDailyConsumptionPollingInterval(null);
              setDailyConsumptionDataUrl(updatedR65Request.dataUrl);
              setDailyConsumptionMessage(`✅ Daily consumption data ready! Request ID: ${updatedR65Request.id}`);
              setDailyConsumptionLoading(false);
            } else if (updatedR65Request?.status === 'FAILED') {
              clearInterval(pollInterval);
              setDailyConsumptionPollingInterval(null);
              setError(`Daily consumption request failed: ${updatedR65Request.errorMessage || 'Unknown error'}`);
              setDailyConsumptionLoading(false);
            }
          }
        } catch (pollErr) {
          console.error('❌ Error polling order status:', pollErr);
        }
      }, 3000); // Poll every 3 seconds

      setDailyConsumptionPollingInterval(pollInterval);

    } catch (err: any) {
      console.error('❌ Error creating daily consumption order:', err);
      setError(err.message || 'Failed to create daily consumption order');
      setDailyConsumptionLoading(false);
    }
  };

  const handleDownloadDailyConsumptionData = async () => {
    if (!dailyConsumptionDataUrl) return;

    try {
      const response = await fetch(dailyConsumptionDataUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DailyConsumption_R65_${dailyConsumptionRequestId}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Daily consumption data downloaded successfully');
    } catch (err: any) {
      console.error('❌ Error downloading daily consumption data:', err);
      setError(`Error downloading data: ${err.message}`);
    }
  };

  const hasData = Object.keys(retrievedData).length > 0;

  const requestOptions = [
    { type: 'C68', label: 'Détails du contrat (C68)', icon: FileText },
    { type: 'R65_SYNC', label: 'Consommation quotidienne (R65)', icon: Calendar },
    { type: 'R65_PRODUCTION', label: 'Production quotidienne (R65)', icon: Sun },
    { type: 'R66_SYNC', label: 'Puissances max (R66)', icon: Zap }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Étape 3 : Sélection et récupération des données
        </h3>

        <div className="space-y-6">
          {/* Sélection des types de données */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">
              Sélectionnez les types de données à récupérer :
            </h4>
            <div className="space-y-3">
              {requestOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedRequests.includes(option.type);
                const requestStatus = requestStatuses[option.type];

                return (
                  <div
                    key={option.type}
                    className={`border rounded-lg p-4 transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRequestSelection(option.type)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <Icon className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-900">{option.label}</span>
                      </label>

                      {requestStatus && (
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            requestStatus.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                            requestStatus.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            requestStatus.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {requestStatus.status}
                          </span>
                          {requestStatus.status === 'SUCCESS' && dataFetched[option.type] && (
                            <button
                              onClick={() => handleDownloadRequestData(option.type)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Télécharger
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sélecteur de pas de temps pour LOADCURVE seulement */}
          {selectedRequests.includes('LOADCURVE') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label htmlFor="loadcurve-period" className="block text-sm font-medium text-gray-900 mb-2">
                Pas de temps pour la courbe de charge
              </label>
              <select
                id="loadcurve-period"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="15min">15 minutes</option>
                <option value="30min">30 minutes (recommandé)</option>
                <option value="1h">1 heure</option>
              </select>
              <p className="text-sm text-gray-600 mt-2">
                Le pas de temps détermine la granularité des données de la courbe de charge.
              </p>
            </div>
          )}

          {/* Bouton de commande */}
          <div>
            <button
              onClick={handleOrderSelectedData}
              disabled={loading || selectedRequests.length === 0}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Commande en cours...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="h-5 w-5" />
                  <span>Commander les données sélectionnées ({selectedRequests.length})</span>
                </>
              )}
            </button>
            {selectedRequests.length === 0 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Sélectionnez au moins un type de données pour continuer
              </p>
            )}

            {/* Nouveau bouton Type de compteur */}
            <div className="mt-4">
              <button
                onClick={handleMeterTypeClick}
                disabled={meterTypeLoading}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                {meterTypeLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Récupération en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    <span>Type de compteur</span>
                  </>
                )}
              </button>
            </div>

            {/* Messages de succès et d'erreur */}
            {successMessage && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">{successMessage}</p>
                </div>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Statut de la commande */}
          {currentOrder && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Statut de la commande</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentOrder.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                  currentOrder.status === 'SOME_REQUESTS_FAILED' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {currentOrder.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Order ID:</span> <code className="bg-white px-2 py-1 rounded text-xs">{currentOrder.id}</code>
              </div>
            </div>
          )}

          {/* Polling status */}
          {isPolling && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <div>
                  <p className="font-medium text-blue-900">Récupération des données en cours...</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Cela peut prendre quelques minutes selon la quantité de données
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success message */}
          {hasData && !isPolling && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-900">Données récupérées avec succès</h4>
              </div>
              <p className="text-sm text-green-800">
                Vos données de consommation sont maintenant disponibles ci-dessous.
              </p>
            </div>
          )}

          {/* R65 Annual Consumption Result */}
          {r65AnnualLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <div>
                  <p className="font-medium text-blue-900">Traitement R65 en cours...</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Création de la commande et récupération des données
                  </p>
                </div>
              </div>
            </div>
          )}

          {r65AnnualCount !== null && !r65AnnualLoading && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-900">
                  Import R65 OK — {r65AnnualCount} enregistrements
                </h4>
              </div>
              {r65AnnualRequestId && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Request ID:</span>{' '}
                  <code className="bg-white px-2 py-1 rounded text-xs">{r65AnnualRequestId}</code>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
        </div>
      </div>

      {/* R65 Annual Chart */}
      {r65AnnualData && r65AnnualData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Consommation annuelle — Total: {Math.round(r65AnnualData.reduce((s, d) => s + d.energy_total_kwh, 0))} kWh
            </h3>
          </div>
          <AnnualConsumptionChart
            data={r65AnnualData.map(row => ({
              date: row.date,
              peak_hours: 0,
              off_peak_hours: 0,
              total: row.energy_total_kwh
            }))}
            loading={false}
            error={null}
            title=""
            hpHcTotals={undefined}
            hpHcMonthly={[]}
            hpHcWeekly={[]}
          />
        </div>
      )}

      {r65AnnualData && r65AnnualData.length === 0 && !r65AnnualLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">Aucune donnée trouvée</p>
          </div>
        </div>
      )}

      {/* R65 INJECTION Chart */}
      {r65InjectionData && r65InjectionData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Production injectée annuelle — Total: {Math.round(r65InjectionData.reduce((s, d) => s + d.energy_total_kwh, 0))} kWh
            </h3>
          </div>
          <AnnualConsumptionChart
            data={r65InjectionData.map(row => ({
              date: row.date,
              peak_hours: 0,
              off_peak_hours: 0,
              total: row.energy_total_kwh
            }))}
            loading={false}
            error={null}
            title=""
            hpHcTotals={undefined}
            hpHcMonthly={[]}
            hpHcWeekly={[]}
          />
        </div>
      )}

      {/* R66 Max Power Chart */}
      {r66Data && r66Data.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Puissance maximale quotidienne (365 derniers jours)
            </h3>
          </div>
          <MaxPowerChart
            data={r66Data}
            loading={false}
            error={null}
          />
        </div>
      )}

      {/* R63_SYNC Chart (7 jours) */}
      {r63SyncData && r63SyncData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Courbe de charge
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {r63SyncCount} points de mesure (pas: {selectedPeriod})
            </p>
          </div>
          <DailyAveragePowerCurve
            data={r63SyncData.map(point => ({
              date: point.datetime,
              value: point.power_kw
            }))}
            title=""
          />
        </div>
      )}

      {/* METER TYPE Response Section */}
      {meterPhaseType && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-500">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Zap className="h-6 w-6 text-purple-600" />
            Type de compteur détecté
          </h3>

          <div className="space-y-4">
            {/* Phase Type Display */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-300">
              <div className="text-center">
                <div className="text-sm font-medium text-purple-700 mb-2">Type de compteur</div>
                <div className="text-3xl font-bold text-purple-900 mb-2">
                  {meterPhaseType === 'single-phase' ? 'Monophasé' :
                   meterPhaseType === 'three-phase' ? 'Triphasé' :
                   meterPhaseType}
                </div>
                <div className="text-xs font-mono text-purple-600 bg-purple-200 inline-block px-3 py-1 rounded-full">
                  {meterPhaseType}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEBUG WINDOW - Meter Type Request & Response */}
      {(meterDebugRequest || meterDebugResponse) && (
        <div className="bg-gray-900 rounded-lg shadow-lg p-6 border-2 border-gray-700">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-400" />
            Debug - Type de compteur
          </h3>

          <div className="space-y-6">
            {/* Request sent */}
            {meterDebugRequest && (
              <div>
                <div className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                  Requête envoyée
                </div>
                <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(meterDebugRequest, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Response received */}
            {meterDebugResponse && (
              <div>
                <div className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                  Réponse reçue
                </div>
                <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-blue-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(meterDebugResponse, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {hasData && (
        <div className="space-y-6">
          {/* Affichage des détails du contrat C68 */}
          {retrievedData.contractDetails && (
            <ContractDetailsDisplay
              contractData={retrievedData.contractDetails}
            />
          )}

          {retrievedData.consumption && Array.isArray(retrievedData.consumption) && retrievedData.consumption.length > 0 && (
            <div data-chart="consumption">
              <AnnualConsumptionChart
                data={retrievedData.consumption}
                maxPowerData={retrievedData.maxPower}
                loadCurveData={retrievedData.loadCurve}
                loading={false}
                error={null}
                title="Consommation annuelle (Switchgrid)"
              />
            </div>
          )}

          {retrievedData.production && Array.isArray(retrievedData.production) && retrievedData.production.length > 0 && (
            <div data-chart="production">
              <AnnualConsumptionChart
                data={retrievedData.production}
                maxPowerData={undefined}
                loadCurveData={undefined}
                loading={false}
                error={null}
                title="Production solaire injectée (Switchgrid)"
              />
            </div>
          )}

          {retrievedData.loadCurve && (
            <div className="space-y-4">
              <div data-chart="load-curve">
                <DailyAveragePowerCurve
                  data={retrievedData.loadCurve}
                  title="Courbe de charge (Switchgrid)"
                />
              </div>

              {loadCurveRequestId && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Télécharger la courbe de charge
                  </h4>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label htmlFor="period-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Pas de temps
                      </label>
                      <select
                        id="period-select"
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="15min">15 minutes</option>
                        <option value="30min">30 minutes</option>
                        <option value="1h">1 heure</option>
                      </select>
                    </div>
                    <button
                      onClick={handleDownloadLoadCurve}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Téléchargement...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          <span>Télécharger CSV</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Le fichier CSV contiendra les données de courbe de charge avec le pas de temps sélectionné.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nouvelle section LOAD CURVE avec les 3 Edge Functions */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow-lg p-6 border-2 border-indigo-200">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Courbe de charge (Nouvelle API)
          </h3>
          <p className="text-sm text-indigo-700">
            Utilisez les nouvelles Edge Functions (create-order, get-order, get-request-data) pour récupérer la courbe de charge.
          </p>
        </div>
        <LoadCurveSection
          consentId={Object.values(ask.consentIds)[0]}
          usagePointId={ask.contracts?.[0]?.prm}
          onDataRetrieved={(data) => {
            console.log('📊 Load curve data retrieved:', data);
          }}
        />
      </div>
    </div>
  );
}