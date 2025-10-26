import { useState, useCallback } from 'react';
import { createC68Order, parseC68ContractData } from '../utils/api/switchgridC68Api';
import { createR65Order } from '../utils/api/switchgridR65Api';
import { createOrder, pollOrderUntilSuccess, getRequestData } from '../utils/api/switchgridLoadCurveApi';

export type DataStatus = 'idle' | 'loading' | 'success' | 'error';

export interface MeterDataState {
  c68: {
    status: DataStatus;
    data: any;
    error: string | null;
  };
  r65: {
    status: DataStatus;
    data: any;
    error: string | null;
  };
  loadCurve: {
    status: DataStatus;
    data: any;
    error: string | null;
    orderId?: string;
    requestId?: string;
  };
  dailyBehavior: {
    status: DataStatus;
    data: any;
    error: string | null;
    orderId?: string;
    requestId?: string;
  };
  production: {
    status: DataStatus;
    data: any;
    error: string | null;
    orderId?: string;
    requestId?: string;
  };
}

const initialState: MeterDataState = {
  c68: { status: 'idle', data: null, error: null },
  r65: { status: 'idle', data: null, error: null },
  loadCurve: { status: 'idle', data: null, error: null },
  dailyBehavior: { status: 'idle', data: null, error: null },
  production: { status: 'idle', data: null, error: null }
};

export function useMeterDataFetcher() {
  const [state, setState] = useState<MeterDataState>(initialState);

  const updateState = useCallback((key: keyof MeterDataState, updates: Partial<MeterDataState[typeof key]>) => {
    setState(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  }, []);

  const fetchC68Data = useCallback(async (prm: string, consentId: string) => {
    updateState('c68', { status: 'loading', error: null });
    try {
      const response = await createC68Order({ prm, consent_id: consentId });
      const parsedData = parseC68ContractData(response);
      updateState('c68', { status: 'success', data: parsedData });
      return parsedData;
    } catch (error: any) {
      updateState('c68', { status: 'error', error: error.message });
      throw error;
    }
  }, [updateState]);

  const fetchR65Data = useCallback(async (prm: string, consentId: string) => {
    updateState('r65', { status: 'loading', error: null });
    try {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const response = await createR65Order({
        prm,
        consent_id: consentId,
        start_date: oneYearAgo.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
        returnRows: true
      });

      updateState('r65', { status: 'success', data: response });
      return response;
    } catch (error: any) {
      updateState('r65', { status: 'error', error: error.message });
      throw error;
    }
  }, [updateState]);

  const fetchLoadCurveData = useCallback(async (prm: string, consentId: string) => {
    updateState('loadCurve', { status: 'loading', error: null });
    try {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const order = await createOrder(consentId, [{
        type: 'LOADCURVE',
        direction: 'CONSUMPTION',
        usagePointId: prm,
        start: oneYearAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }]);

      updateState('loadCurve', { orderId: order.id });

      const completedOrder = await pollOrderUntilSuccess(order.id, 180, 5000);

      const requestId = completedOrder.requests[0]?.id;
      if (!requestId) {
        throw new Error('No request ID found in completed order');
      }

      updateState('loadCurve', { requestId });

      const data = await getRequestData(requestId, 'json', '30min');

      updateState('loadCurve', { status: 'success', data });
      return data;
    } catch (error: any) {
      updateState('loadCurve', { status: 'error', error: error.message });
      throw error;
    }
  }, [updateState]);

  const fetchDailyBehaviorData = useCallback(async (prm: string, consentId: string) => {
    updateState('dailyBehavior', { status: 'loading', error: null });
    try {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const order = await createOrder(consentId, [{
        type: 'LOADCURVE',
        direction: 'CONSUMPTION',
        usagePointId: prm,
        start: oneYearAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }]);

      updateState('dailyBehavior', { orderId: order.id });

      const completedOrder = await pollOrderUntilSuccess(order.id, 180, 5000);

      const requestId = completedOrder.requests[0]?.id;
      if (!requestId) {
        throw new Error('No request ID found in completed order');
      }

      updateState('dailyBehavior', { requestId });

      const data = await getRequestData(requestId, 'json', '30min');

      updateState('dailyBehavior', { status: 'success', data });
      return data;
    } catch (error: any) {
      updateState('dailyBehavior', { status: 'error', error: error.message });
      throw error;
    }
  }, [updateState]);

  const fetchProductionData = useCallback(async (prm: string, consentId: string) => {
    updateState('production', { status: 'loading', error: null });
    try {
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const order = await createOrder(consentId, [{
        type: 'LOADCURVE',
        direction: 'INJECTION',
        usagePointId: prm,
        start: oneYearAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }]);

      updateState('production', { orderId: order.id });

      const completedOrder = await pollOrderUntilSuccess(order.id, 180, 5000);

      const requestId = completedOrder.requests[0]?.id;
      if (!requestId) {
        throw new Error('No request ID found in completed order');
      }

      updateState('production', { requestId });

      const data = await getRequestData(requestId, 'json', '30min');

      updateState('production', { status: 'success', data });
      return data;
    } catch (error: any) {
      updateState('production', { status: 'error', error: error.message });
      return null;
    }
  }, [updateState]);

  const fetchAllData = useCallback(async (prm: string, consentId: string) => {
    await Promise.allSettled([
      fetchC68Data(prm, consentId),
      fetchR65Data(prm, consentId),
      fetchLoadCurveData(prm, consentId),
      fetchDailyBehaviorData(prm, consentId),
      fetchProductionData(prm, consentId)
    ]);
  }, [fetchC68Data, fetchR65Data, fetchLoadCurveData, fetchDailyBehaviorData, fetchProductionData]);

  const retryFetch = useCallback(async (dataType: keyof MeterDataState, prm: string, consentId: string) => {
    switch (dataType) {
      case 'c68':
        return fetchC68Data(prm, consentId);
      case 'r65':
        return fetchR65Data(prm, consentId);
      case 'loadCurve':
        return fetchLoadCurveData(prm, consentId);
      case 'dailyBehavior':
        return fetchDailyBehaviorData(prm, consentId);
      case 'production':
        return fetchProductionData(prm, consentId);
    }
  }, [fetchC68Data, fetchR65Data, fetchLoadCurveData, fetchDailyBehaviorData, fetchProductionData]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    fetchAllData,
    retryFetch,
    reset
  };
}
