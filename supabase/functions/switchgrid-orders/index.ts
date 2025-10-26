import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SWITCHGRID_CONFIG = {
  baseUrl: 'https://app.switchgrid.tech/enedis/v2',
  token: 'c85136b872194092cf9d013c6fe6ce5c'
};

console.log('🚀 Switchgrid Orders Function Starting...');
console.log('📍 Base URL:', SWITCHGRID_CONFIG.baseUrl);
console.log('🔑 Token configured:', SWITCHGRID_CONFIG.token ? 'Yes' : 'No');

// =====================================================
// HELPERS - C68 Order Creation and Polling
// =====================================================

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sgGetOrder(orderId) {
  const r = await fetch(`${SWITCHGRID_CONFIG.baseUrl}/order/${orderId}`, {
    headers: { Authorization: `Bearer ${SWITCHGRID_CONFIG.token}` }
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`GET /order/${orderId} failed ${r.status}: ${t}`);
  return JSON.parse(t);
}

async function sgPollOrderUntilSuccess(orderId, reqType, timeoutMs = 90_000, stepMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ord = await sgGetOrder(orderId);
    const req = ord?.requests?.find((x) => x.type === reqType);
    if (!req) throw new Error(`No ${reqType} request found in order`);
    if (req.status === "SUCCESS") return req;
    if (req.status === "FAILED") throw new Error(req.errorMessage || `${reqType} failed`);
    await sleep(stepMs);
  }
  throw new Error(`Timeout waiting for ${reqType} SUCCESS`);
}

async function sgGetConsentIdFromAsk(askId, prm) {
  if (!askId) throw new Error("askId requis");
  if (!prm) throw new Error("prm requis");

  const r = await fetch(`${SWITCHGRID_CONFIG.baseUrl}/ask/${askId}`, {
    headers: { Authorization: `Bearer ${SWITCHGRID_CONFIG.token}` }
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`GET /ask/${askId} failed ${r.status}: ${t}`);

  const ask = JSON.parse(t);
  let consentId = ask?.consentIds?.[prm];
  if (!consentId && Array.isArray(ask?.consents)) {
    const found = ask.consents.find((c) => c?.prm === prm || c?.pdl === prm);
    consentId = found?.id || found?.consentId;
  }
  if (!consentId) throw new Error(`Aucun consentId trouvé pour PRM ${prm}`);
  return consentId;
}

async function sgPostOrderC68(consentId, prm) {
  if (!consentId || typeof consentId !== "string") throw new Error("consentId (string) requis");
  if (!prm) throw new Error("prm requis");

  const res = await fetch(`${SWITCHGRID_CONFIG.baseUrl}/order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SWITCHGRID_CONFIG.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      consentId,
      requests: [{ type: "C68", prms: [String(prm)] }]
    })
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`POST /order failed ${res.status}: ${txt}`);
  return JSON.parse(txt);
}

async function sgPostOrderR65Like(type, consentId, prm, since, until) {
  if (!consentId) throw new Error("consentId requis");
  if (!prm) throw new Error("prm requis");

  const req = { type, prms: [String(prm)] };
  if (since) req.since = since;
  if (until) req.until = until;

  const res = await fetch(`${SWITCHGRID_CONFIG.baseUrl}/order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SWITCHGRID_CONFIG.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ consentId, requests: [req] })
  });
  const txt = await res.text();
  console.log(`🔹 POST /order (${type}) →`, res.status, txt);
  if (!res.ok) throw new Error(`POST /order ${type} failed ${res.status}: ${txt}`);
  return JSON.parse(txt);
}

/** Parse le format grandeur/points (Wh) vers lignes journalières kWh */
function parseR65Switchgrid(raw) {
  console.log('🔧 parseR65Switchgrid called');
  if (!raw) {
    console.warn('⚠️ parseR65Switchgrid: raw is null/undefined');
    return [];
  }

  // trouver grandeur consommation énergie active (EA)
  console.log('🔍 Looking for grandeur in raw.grandeur, isArray:', Array.isArray(raw.grandeur));
  const g = Array.isArray(raw.grandeur)
    ? raw.grandeur.find((x) =>
        (x.grandeurMetier === "CONS" || x.grandeurMetier === "CONSO" || x.grandeurMetier === "CONSUMPTION") &&
        (x.grandeurPhysique === "EA" || x.grandeurPhysique === "E")
      )
    : null;

  if (!g) {
    console.error('❌ No matching grandeur found! Available grandeurs:',
      Array.isArray(raw.grandeur)
        ? raw.grandeur.map((x) => `${x.grandeurMetier}/${x.grandeurPhysique}`).join(', ')
        : 'none'
    );
    return [];
  }

  console.log('✅ Found grandeur:', g.grandeurMetier, '/', g.grandeurPhysique);

  const points = g?.points || [];
  console.log(`📍 Points array length: ${points.length}`);
  if (!Array.isArray(points) || points.length === 0) {
    console.warn('⚠️ No points in grandeur');
    return [];
  }

  // unité Wh -> kWh (tolérance majuscule/minuscule)
  const unit = (g?.unite || '').toLowerCase();
  const factor = unit === 'wh' ? 1 / 1000 : 1; // kWh ou autre → facteur 1

  return points.map((p) => {
    const date = p.d || p.date;
    const v = Number(p.v ?? p.value ?? 0);
    const totalKwh = Math.round(v * factor * 1000) / 1000; // 3 décimales
    return {
      date,
      energy_total_kwh: totalKwh,
      // pas de cadrans dans ce flux → on pose BASE
      energy_by_cadran: { BASE: totalKwh }
    };
  });
}

function extractTariffInfo(c68Data) {
  const formulaCode = c68Data?.formule_tarifaire_acheminement || c68Data?.formula_code || 'UNKNOWN';

  let tariffType = 'BASE';
  let tariffStructure = {
    type: 'BASE',
    cadrans: [{ name: 'BASE', label: 'Base', color: '#3B82F6', order: 1 }]
  };

  if (formulaCode.includes('TEMPO')) {
    tariffType = 'TEMPO';
    tariffStructure = {
      type: 'TEMPO',
      cadrans: [
        { name: 'BLEU_HP', label: 'Bleu Heures Pleines', color: '#3B82F6', order: 1 },
        { name: 'BLEU_HC', label: 'Bleu Heures Creuses', color: '#60A5FA', order: 2 },
        { name: 'BLANC_HP', label: 'Blanc Heures Pleines', color: '#F3F4F6', order: 3 },
        { name: 'BLANC_HC', label: 'Blanc Heures Creuses', color: '#D1D5DB', order: 4 },
        { name: 'ROUGE_HP', label: 'Rouge Heures Pleines', color: '#EF4444', order: 5 },
        { name: 'ROUGE_HC', label: 'Rouge Heures Creuses', color: '#FCA5A5', order: 6 }
      ]
    };
  } else if (formulaCode.includes('HC') || formulaCode.includes('CREUSE') || c68Data?.calendrier_distributeur?.includes('HC')) {
    tariffType = 'HP_HC';
    tariffStructure = {
      type: 'HP_HC',
      cadrans: [
        { name: 'HP', label: 'Heures Pleines', color: '#F97316', order: 1 },
        { name: 'HC', label: 'Heures Creuses', color: '#3B82F6', order: 2 }
      ]
    };
  } else if (formulaCode.includes('EJP')) {
    tariffType = 'EJP';
    tariffStructure = {
      type: 'EJP',
      cadrans: [
        { name: 'NORMAL', label: 'Heures Normales', color: '#3B82F6', order: 1 },
        { name: 'POINTE', label: 'Heures de Pointe Mobile', color: '#EF4444', order: 2 }
      ]
    };
  } else if (formulaCode.includes('CU') || formulaCode.includes('MU') || formulaCode.includes('LU')) {
    tariffType = 'PROFESSIONAL';
    const numCadrans = 6;
    tariffStructure = {
      type: 'PROFESSIONAL',
      cadrans: Array.from({ length: numCadrans }, (_, i) => ({
        name: `CADRAN_${i + 1}`,
        label: `Cadran ${i + 1}`,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][i],
        order: i + 1
      }))
    };
  }

  console.log('📊 Tariff detected:', tariffType, 'Formula:', formulaCode);
  return { tariffType, tariffStructure, formulaCode };
}

function parseConsumptionData(r65Data, tariffStructure) {
  let dataArray = r65Data;
  if (!Array.isArray(r65Data)) {
    dataArray = r65Data?.results || r65Data?.data || r65Data?.items || [];
  }

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.warn('⚠️ No consumption data to parse');
    return [];
  }

  return dataArray.map((item) => {
    const date = item.date || item.jour || item.day;
    let energyByCadran = {};
    let total = 0;

    if (tariffStructure.type === 'BASE') {
      const value = item.base || item.total || item.energy || 0;
      energyByCadran = { BASE: value };
      total = value;
    } else if (tariffStructure.type === 'HP_HC') {
      const hp = item.hp || item.peak_hours || item.hph || 0;
      const hc = item.hc || item.off_peak_hours || item.hch || 0;
      energyByCadran = { HP: hp, HC: hc };
      total = hp + hc;
    } else if (tariffStructure.type === 'TEMPO') {
      energyByCadran = {
        BLEU_HP: item.bleu_hp || item.hphcb || 0,
        BLEU_HC: item.bleu_hc || item.hchcb || 0,
        BLANC_HP: item.blanc_hp || item.hphcw || 0,
        BLANC_HC: item.blanc_hc || item.hchcw || 0,
        ROUGE_HP: item.rouge_hp || item.hphcr || 0,
        ROUGE_HC: item.rouge_hc || item.hchcr || 0
      };
      total = Object.values(energyByCadran).reduce((sum, val) => sum + (val || 0), 0);
    } else if (tariffStructure.type === 'PROFESSIONAL') {
      for (let i = 1; i <= 6; i++) {
        const cadranValue = item[`cadran_${i}`] || item[`c${i}`] || 0;
        if (cadranValue > 0) {
          energyByCadran[`CADRAN_${i}`] = cadranValue;
          total += cadranValue;
        }
      }
    }

    if (total === 0 && item.total) {
      total = item.total;
    }

    return {
      date,
      energy_total_kwh: total,
      energy_by_cadran: energyByCadran
    };
  });
}

function parseMaxPowerData(r66Data, tariffStructure) {
  let dataArray = r66Data;
  if (!Array.isArray(r66Data)) {
    dataArray = r66Data?.results || r66Data?.data || r66Data?.items || [];
  }

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.warn('⚠️ No max power data to parse');
    return [];
  }

  return dataArray.map((item) => {
    const date = item.date || item.jour || item.day;
    const maxPower = item.max_power || item.pmax || item.puissance_max || 0;
    let maxPowerByCadran = null;

    if (item.max_power_by_cadran || item.cadrans) {
      maxPowerByCadran = item.max_power_by_cadran || item.cadrans;
    }

    return {
      date,
      max_power_kw: maxPower,
      max_power_by_cadran: maxPowerByCadran
    };
  });
}

function parseLoadCurveData(loadCurveData) {
  let dataArray = loadCurveData;
  if (!Array.isArray(loadCurveData)) {
    dataArray = loadCurveData?.results || loadCurveData?.data || loadCurveData?.items || [];
  }

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.warn('⚠️ No load curve data to parse');
    return [];
  }

  return dataArray.map((item) => ({
    timestamp: item.timestamp || item.horodate || item.date,
    power_kw: item.power || item.puissance || item.value || 0,
    interval_duration: item.interval || item.pas || 'PT10M'
  }));
}

// =====================================================
// SAUVEGARDE DANS SUPABASE
// =====================================================

async function saveToSupabase(supabase, userId, pdl, orderData, allRequestsData) {
  const stats = {
    consumption: 0,
    production: 0,
    consumptionMaxPower: 0,
    productionMaxPower: 0,
    consumptionLoadCurve: 0,
    productionLoadCurve: 0,
    contract: 0
  };

  try {
    const orderId = orderData.id;
    console.log('💾 Starting Supabase save for PDL:', pdl, 'User:', userId);

    const { error: orderError } = await supabase
      .from('switchgrid_orders')
      .upsert({
        user_id: userId,
        pdl: pdl,
        order_id: orderId,
        order_status: orderData.status,
        order_data: orderData,
        requests: orderData.requests,
        completed_at: new Date().toISOString()
      }, { onConflict: 'order_id' });

    if (orderError) {
      console.error('❌ Error saving order:', orderError);
      throw new Error(`Failed to save order: ${orderError.message}`);
    }

    const c68Data = allRequestsData.contractDetails;
    if (c68Data) {
      const { tariffType, tariffStructure, formulaCode } = extractTariffInfo(c68Data);

      const { error: contractError } = await supabase
        .from('switchgrid_contract_details')
        .upsert({
          user_id: userId,
          pdl: pdl,
          contract_data: c68Data,
          tariff_type: tariffType,
          tariff_structure: tariffStructure,
          formula_code: formulaCode,
          source_order_id: orderId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'pdl,user_id' });

      if (contractError) {
        console.error('❌ Error saving contract:', contractError);
      } else {
        stats.contract = 1;
        console.log('✅ Contract saved');
      }

      if (allRequestsData.consumption) {
        const consumptionRows = parseConsumptionData(allRequestsData.consumption, tariffStructure);
        if (consumptionRows.length > 0) {
          const rows = consumptionRows.map((row) => ({
            user_id: userId,
            pdl: pdl,
            date: row.date,
            energy_total_kwh: row.energy_total_kwh,
            energy_by_cadran: row.energy_by_cadran,
            source_order_id: orderId
          }));

          const { error: consError } = await supabase
            .from('switchgrid_consumption_daily')
            .upsert(rows, { onConflict: 'pdl,date,user_id' });

          if (consError) {
            console.error('❌ Error saving consumption:', consError);
          } else {
            stats.consumption = rows.length;
            console.log(`✅ Consumption saved: ${rows.length} rows`);
          }
        }
      }

      if (allRequestsData.maxPower) {
        const maxPowerRows = parseMaxPowerData(allRequestsData.maxPower, tariffStructure);
        if (maxPowerRows.length > 0) {
          const rows = maxPowerRows.map((row) => ({
            user_id: userId,
            pdl: pdl,
            date: row.date,
            max_power_kw: row.max_power_kw,
            max_power_by_cadran: row.max_power_by_cadran,
            source_order_id: orderId
          }));

          const { error: maxPowerError } = await supabase
            .from('switchgrid_max_power')
            .upsert(rows, { onConflict: 'pdl,date,user_id' });

          if (maxPowerError) {
            console.error('❌ Error saving max power:', maxPowerError);
          } else {
            stats.consumptionMaxPower = rows.length;
            console.log(`✅ Max power saved: ${rows.length} rows`);
          }
        }
      }

      if (allRequestsData.loadCurve) {
        const loadCurveRows = parseLoadCurveData(allRequestsData.loadCurve);
        if (loadCurveRows.length > 0) {
          const BATCH_SIZE = 1000;
          let totalSaved = 0;

          for (let i = 0; i < loadCurveRows.length; i += BATCH_SIZE) {
            const batch = loadCurveRows.slice(i, i + BATCH_SIZE);
            const rows = batch.map((row) => ({
              user_id: userId,
              pdl: pdl,
              timestamp: row.timestamp,
              power_kw: row.power_kw,
              interval_duration: row.interval_duration,
              source_order_id: orderId
            }));

            const { error: loadCurveError } = await supabase
              .from('switchgrid_load_curve')
              .upsert(rows, { onConflict: 'pdl,timestamp,user_id' });

            if (loadCurveError) {
              console.error(`❌ Error saving load curve batch ${i}:`, loadCurveError);
            } else {
              totalSaved += rows.length;
            }
          }
          stats.consumptionLoadCurve = totalSaved;
          console.log(`✅ Load curve saved: ${totalSaved} rows`);
        }
      }

      if (allRequestsData.production) {
        const productionRows = parseConsumptionData(allRequestsData.production, tariffStructure);
        if (productionRows.length > 0) {
          const rows = productionRows.map((row) => ({
            user_id: userId,
            pdl: pdl,
            date: row.date,
            energy_total_kwh: row.energy_total_kwh,
            energy_by_cadran: row.energy_by_cadran,
            source_order_id: orderId
          }));

          const { error: prodError } = await supabase
            .from('switchgrid_production_daily')
            .upsert(rows, { onConflict: 'pdl,date,user_id' });

          if (prodError) {
            console.error('❌ Error saving production:', prodError);
          } else {
            stats.production = rows.length;
            console.log(`✅ Production saved: ${rows.length} rows`);
          }
        }
      }

      if (allRequestsData.productionMaxPower) {
        const prodMaxPowerRows = parseMaxPowerData(allRequestsData.productionMaxPower, tariffStructure);
        if (prodMaxPowerRows.length > 0) {
          const rows = prodMaxPowerRows.map((row) => ({
            user_id: userId,
            pdl: pdl,
            date: row.date,
            max_power_kw: row.max_power_kw,
            source_order_id: orderId
          }));

          const { error: prodMaxError } = await supabase
            .from('switchgrid_production_max_power')
            .upsert(rows, { onConflict: 'pdl,date,user_id' });

          if (prodMaxError) {
            console.error('❌ Error saving production max power:', prodMaxError);
          } else {
            stats.productionMaxPower = rows.length;
            console.log(`✅ Production max power saved: ${rows.length} rows`);
          }
        }
      }

      if (allRequestsData.productionLoadCurve) {
        const prodLoadCurveRows = parseLoadCurveData(allRequestsData.productionLoadCurve);
        if (prodLoadCurveRows.length > 0) {
          const BATCH_SIZE = 1000;
          let totalSaved = 0;

          for (let i = 0; i < prodLoadCurveRows.length; i += BATCH_SIZE) {
            const batch = prodLoadCurveRows.slice(i, i + BATCH_SIZE);
            const rows = batch.map((row) => ({
              user_id: userId,
              pdl: pdl,
              timestamp: row.timestamp,
              power_kw: row.power_kw,
              interval_duration: row.interval_duration,
              source_order_id: orderId
            }));

            const { error: prodLoadError } = await supabase
              .from('switchgrid_production_load_curve')
              .upsert(rows, { onConflict: 'pdl,timestamp,user_id' });

            if (prodLoadError) {
              console.error(`❌ Error saving production load curve batch ${i}:`, prodLoadError);
            } else {
              totalSaved += rows.length;
            }
          }
          stats.productionLoadCurve = totalSaved;
          console.log(`✅ Production load curve saved: ${totalSaved} rows`);
        }
      }
    }

    console.log('📊 Final stats:', stats);
    return { success: true, stats };
  } catch (error) {
    console.error('❌ Error in saveToSupabase:', error);
    return { success: false, stats, error: error.message };
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================

Deno.serve(async (req) => {
  console.log('📨 Request received:', req.method, new URL(req.url).pathname);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    let body;
    try {
      body = await req.json();
      console.log('📦 Request body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const action = body?.action;

    if (action === 'create_order') {
      const orderRequest = body?.orderRequest;
      if (!orderRequest) {
        return new Response(JSON.stringify({ error: 'orderRequest required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      console.log('📤 Creating order with Switchgrid API');

      const cleanedRequests = orderRequest.requests.map((request) => {
        const cleaned = { ...request };
        if (request.type === 'C68' && cleaned.direction) {
          delete cleaned.direction;
        }
        return cleaned;
      });

      const cleanedOrderRequest = { ...orderRequest, requests: cleanedRequests };

      // Sanitize consentId - tenant refuses null
      if (cleanedOrderRequest.consentId === null || cleanedOrderRequest.consentId === undefined || cleanedOrderRequest.consentId === "") {
        delete cleanedOrderRequest.consentId;
      }

      console.log('🔄 Cleaned order request:', JSON.stringify(cleanedOrderRequest, null, 2));

      try {
        const response = await fetch(`${SWITCHGRID_CONFIG.baseUrl}/order`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SWITCHGRID_CONFIG.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ABI-Energie-Simulator/1.0',
            'Origin': 'https://app.switchgrid.tech'
          },
          body: JSON.stringify(cleanedOrderRequest)
        });

        console.log('📥 Switchgrid response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Switchgrid API error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });

          if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
            return new Response(JSON.stringify({
              error: `L'API Switchgrid est temporairement indisponible (erreur ${response.status})`
            }), {
              status: 502,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }

          const errorMessage = errorData.error?.[0]?.message || errorData.message || errorData.error || `Erreur ${response.status}`;
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const responseData = await response.json();
        console.log('✅ Order created successfully:', responseData.id);

        return new Response(JSON.stringify(responseData), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (fetchError) {
        console.error('❌ Network error:', fetchError);
        return new Response(JSON.stringify({ error: `Erreur réseau: ${fetchError.message}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (action === 'get_order') {
      const orderId = body?.orderId;
      if (!orderId) {
        return new Response(JSON.stringify({ error: 'orderId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      console.log('🔍 Getting order status:', orderId);

      try {
        const response = await fetch(`${SWITCHGRID_CONFIG.baseUrl}/order/${orderId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SWITCHGRID_CONFIG.token}`,
            'Accept': 'application/json',
            'User-Agent': 'ABI-Energie-Simulator/1.0'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error getting order:', errorText);
          return new Response(JSON.stringify({ error: `Erreur ${response.status}: ${errorText}` }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const orderData = await response.json();
        console.log('✅ Order status retrieved:', orderData.status);

        return new Response(JSON.stringify(orderData), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (error) {
        console.error('❌ Error getting order:', error);
        return new Response(JSON.stringify({
          error: error.message || 'Erreur lors de la récupération de la commande'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (action === 'get_request_data') {
      console.log('🔍 Action get_request_data appelée');
      console.log('📦 Body reçu:', JSON.stringify(body, null, 2));

      const requestId = body?.requestId;
      let requestType = body?.requestType;
      const params = body?.params || {};

      // 🔧 FIX: Mapper R65_PRODUCTION vers R65_SYNC pour l'API
      if (requestType === 'R65_PRODUCTION') {
        console.log('🔄 Mapping R65_PRODUCTION → R65_SYNC');
        requestType = 'R65_SYNC';
      }

      console.log('🔑 RequestId extrait:', requestId);
      console.log('🔑 RequestType extrait:', requestType);
      console.log('⚙️ Params extraits:', JSON.stringify(params, null, 2));

      if (!requestId) {
        console.error('❌ RequestId manquant!');
        return new Response(JSON.stringify({ error: 'requestId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      console.log('📊 Getting request data:', requestId, 'Type:', requestType, 'Params:', params);

      const searchParams = new URLSearchParams();
      if (params.format) searchParams.set('format', params.format);
      if (params.pas) searchParams.set('pas', params.pas);
      if (params.period) searchParams.set('period', params.period);
      if (params.since) searchParams.set('since', params.since);
      if (params.until) searchParams.set('until', params.until);

      // IMPORTANT: Le PRM doit être passé comme paramètre d'URL pour ces types de requête
      const needsPrm = ['C68', 'C68_ASYNC', 'R65', 'R65_SYNC', 'R66', 'LOAD_CURVE'].includes(requestType);
      if (params.prm && needsPrm) {
        searchParams.set('prm', params.prm);
        console.log('🔑 PRM ajouté aux paramètres pour', requestType, ':', params.prm);
      }

      const queryString = searchParams.toString();
      console.log('🔍 Query string:', queryString);
      console.log('🔍 Request params breakdown:', {
        format: params.format || 'not set',
        pas: params.pas || 'not set',
        period: params.period || 'not set',
        since: params.since || 'not set',
        until: params.until || 'not set',
        prm: params.prm ? '***' : 'not set'
      });

      try {
        console.log('🔄 Building URL...');
        const url = `${SWITCHGRID_CONFIG.baseUrl}/request/${requestId}/data?${queryString}`;
        console.log('🌐 Full Request URL:', url.replace(/prm=[^&]+/, 'prm=***'));
        console.log('🌐 Request ID:', requestId);
        console.log('📡 Starting fetch request...');

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${SWITCHGRID_CONFIG.token}`,
            'Accept': params.format === 'csv' ? 'text/csv' : 'application/json',
            'User-Agent': 'ABI-Energie-Simulator/1.0'
          }
        });

        console.log('📥 Fetch completed, status:', response.status);

        if (!response.ok) {
          console.log('⚠️ Response not OK, reading error text...');
          const errorText = await response.text();
          console.error('❌ Switchgrid API returned error!');
          console.error('📊 Status:', response.status);
          console.error('📝 Status Text:', response.statusText);
          console.error('📄 Error Response Body:', errorText);
          console.error('🔍 Error Length:', errorText.length);
          console.error('🔍 First 500 chars:', errorText.substring(0, 500));

          // Try to parse as JSON
          let parsedError;
          try {
            parsedError = JSON.parse(errorText);
            console.error('✅ Parsed as JSON:', JSON.stringify(parsedError, null, 2));
          } catch {
            console.error('⚠️ Not valid JSON, raw text response');
          }

          return new Response(JSON.stringify({ error: `Erreur ${response.status}: ${errorText}` }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        console.log('✅ Response OK, getting content type...');
        const contentType = response.headers.get('Content-Type') || '';
        console.log('📄 Content-Type:', contentType);

        if (contentType.includes('text/csv') || params.format === 'csv') {
          console.log('📊 Parsing as CSV...');
          const csvData = await response.text();
          console.log('✅ CSV data retrieved, length:', csvData.length);
          return new Response(csvData, {
            headers: { 'Content-Type': 'text/csv', ...corsHeaders }
          });
        } else {
          console.log('📊 Parsing as JSON...');
          const jsonData = await response.json();
          console.log('✅ JSON data retrieved:', jsonData ? 'OK' : 'Empty');
          console.log('📦 JSON data preview:', JSON.stringify(jsonData).substring(0, 200));
          return new Response(JSON.stringify(jsonData), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      } catch (error) {
        console.error('💥 EXCEPTION CAUGHT IN get_request_data!');
        console.error('❌ Error getting request data:', error);
        console.error('🔍 Error type:', typeof error);
        console.error('🔍 Error constructor:', error?.constructor?.name);
        console.error('Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
          cause: error?.cause,
          toString: error?.toString()
        });
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const errorDetails = {
          error: errorMessage,
          requestId: requestId,
          params: params,
          timestamp: new Date().toISOString()
        };

        return new Response(JSON.stringify(errorDetails), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (action === 'fetch_url') {
      const url = body?.url;
      if (!url) {
        return new Response(JSON.stringify({ error: 'url required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      console.log('🌐 Proxying fetch for URL:', url.substring(0, 100) + '...');

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error fetching URL:', errorText);
          return new Response(JSON.stringify({ error: `Erreur ${response.status}: ${errorText}` }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const data = await response.json();
        console.log('✅ URL fetched successfully');

        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (error) {
        console.error('❌ Error fetching URL:', error);
        return new Response(JSON.stringify({
          error: error.message || 'Erreur lors de la récupération de l\'URL'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (action === 'save_order_data') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables not configured');
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { pdl, orderData, allRequestsData } = body;

      if (!pdl || !orderData || !allRequestsData) {
        return new Response(JSON.stringify({ error: 'Missing required data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const userId = '00000000-0000-0000-0000-000000000000';
      const result = await saveToSupabase(supabase, userId, pdl, orderData, allRequestsData);

      if (result.success) {
        return new Response(JSON.stringify({
          success: true,
          stats: result.stats,
          message: 'Données sauvegardées avec succès'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: result.error,
          stats: result.stats
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (action === 'create_order_c68') {
      const prm = body?.prm;
      let consentId = body?.consentId;
      const askId = body?.askId;

      if (!prm) {
        return new Response(JSON.stringify({ error: "prm requis" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      try {
        console.log('🔑 Starting C68 order creation for PRM:', prm);

        if (!consentId) {
          if (!askId) {
            return new Response(JSON.stringify({ error: "consentId ou askId requis" }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          console.log('🔍 Resolving consentId from askId:', askId);
          consentId = await sgGetConsentIdFromAsk(askId, prm);
          console.log('✅ ConsentId resolved:', consentId);
        }

        console.log('📤 Creating C68 order...');
        const order = await sgPostOrderC68(consentId, prm);
        const orderId = order.id;
        console.log('✅ Order created:', orderId);

        let reqC68 = order.requests?.find((r) => r.type === "C68");
        if (!reqC68 || reqC68.status !== "SUCCESS") {
          console.log('⏳ Polling for C68 completion...');
          reqC68 = await sgPollOrderUntilSuccess(orderId, "C68");
          console.log('✅ C68 request completed:', reqC68.status);
        }

        if (!reqC68?.dataUrl) {
          return new Response(JSON.stringify({
            orderId,
            requestId: reqC68?.id,
            warning: "C68 SUCCESS sans dataUrl"
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        console.log('📥 Fetching C68 data from dataUrl...');
        const dataRes = await fetch(reqC68.dataUrl);
        const dataTxt = await dataRes.text();
        if (!dataRes.ok) throw new Error(`GET dataUrl failed ${dataRes.status}: ${dataTxt}`);
        const c68json = JSON.parse(dataTxt);
        console.log('✅ C68 data retrieved');

        // Sauvegarde rapide (si env Supabase présents)
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          if (supabaseUrl && supabaseServiceKey) {
            console.log('💾 Saving C68 data to Supabase...');
            const supa = createClient(supabaseUrl, supabaseServiceKey);
            await supa.from('switchgrid_contract_details').upsert({
              user_id: body?.userId || '00000000-0000-0000-0000-000000000000',
              pdl: prm,
              contract_data: c68json,
              source_order_id: orderId,
              updated_at: new Date().toISOString()
            }, { onConflict: 'pdl,user_id' });
            console.log('✅ C68 data saved to Supabase');
          }
        } catch (saveErr) {
          console.error("Save C68 error:", saveErr);
        }

        return new Response(JSON.stringify({
          orderId,
          requestId: reqC68.id,
          c68: c68json
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (e) {
        console.error('❌ Error in create_order_c68:', e);
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (action === 'create_order_r65') {
      const prm = body?.prm;
      let consentId = body?.consentId;
      const askId = body?.askId;

      // fenêtre par défaut: 30 derniers jours si non fournie
      const until = body?.until || new Date().toISOString().slice(0, 10);
      const since = body?.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      if (!prm) {
        return new Response(JSON.stringify({ error: "prm requis" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      try {
        // résout le consentId si besoin
        if (!consentId) {
          if (!askId) {
            return new Response(JSON.stringify({ error: "consentId ou askId requis" }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          consentId = await sgGetConsentIdFromAsk(askId, prm);
        }

        // 1) tenter R65_SYNC, sinon fallback R65
        let order, orderId, reqType = "R65_SYNC";
        try {
          order = await sgPostOrderR65Like("R65_SYNC", consentId, prm, since, until);
        } catch (e) {
          console.log("ℹ️ R65_SYNC indisponible → fallback R65");
          reqType = "R65";
          order = await sgPostOrderR65Like("R65", consentId, prm, since, until);
        }
        orderId = order.id || order.orderId;

        // 2) poll si besoin
        let req = order.requests?.find((r) => r.type === reqType);
        if (!req || req.status !== "SUCCESS") {
          req = await sgPollOrderUntilSuccess(orderId, reqType);
        }

        // 3) récupérer les données
        let dataTxt;
        if (req?.dataUrl) {
          const dataRes = await fetch(req.dataUrl);
          dataTxt = await dataRes.text();
          if (!dataRes.ok) throw new Error(`GET dataUrl failed ${dataRes.status}: ${dataTxt}`);
        } else {
          // fallback via /request/{id}/data
          const url = `${SWITCHGRID_CONFIG.baseUrl}/request/${req.id}/data?since=${since}&until=${until}&prm=${encodeURIComponent(prm)}`;
          const r = await fetch(url, {
            headers: { Authorization: `Bearer ${SWITCHGRID_CONFIG.token}` }
          });
          dataTxt = await r.text();
          if (!r.ok) throw new Error(`GET ${url} failed ${r.status}: ${dataTxt}`);
        }

        const raw = JSON.parse(dataTxt);
        const rows = parseR65Switchgrid(raw);

        // 4) sauvegarde Supabase
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          if (supabaseUrl && supabaseServiceKey) {
            const supa = createClient(supabaseUrl, supabaseServiceKey);
            const userId = body?.userId || '00000000-0000-0000-0000-000000000000';

            if (rows.length > 0) {
              const mapped = rows.map((r) => ({
                user_id: userId,
                pdl: prm,
                date: r.date,
                energy_total_kwh: r.energy_total_kwh,
                energy_by_cadran: r.energy_by_cadran,
                source_order_id: orderId
              }));

              const { error: upErr } = await supa
                .from('switchgrid_consumption_daily')
                .upsert(mapped, { onConflict: 'user_id,pdl,date' });

              if (upErr) {
                console.error('❌ Error saving R65:', upErr);
              } else {
                console.log(`✅ R65 saved: ${mapped.length} rows`);
              }
            } else {
              console.warn('⚠️ No R65 rows to save');
            }
          } else {
            console.warn("⚠️ Supabase env not configured, skip save");
          }
        } catch (saveErr) {
          console.error("❌ Save R65 error:", saveErr);
        }

        return new Response(JSON.stringify({
          orderId,
          requestId: req?.id,
          since,
          until,
          count: rows.length,
          sample: rows[0] || null
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (e) {
        console.error('❌ Error in create_order_r65:', e);
        return new Response(JSON.stringify({ error: e?.message || String(e) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    if (action === 'create_order_r65_year_single') {
      const prm = body?.prm;
      let consentId = body?.consentId;
      const askId = body?.askId;
      const userId = body?.userId || '00000000-0000-0000-0000-000000000000';

      const untilStr = body?.until || new Date().toISOString().slice(0, 10);
      const until = new Date(untilStr + 'T00:00:00Z');
      const since = body?.since
        ? new Date(body.since + 'T00:00:00Z')
        : new Date(new Date(until).setUTCFullYear(until.getUTCFullYear() - 1));
      const sinceStr = body?.since || since.toISOString().slice(0, 10);

      console.log(`📊 R65 one-shot window → since=${sinceStr} until=${untilStr} prm=${prm}`);

      if (!prm) {
        return new Response(JSON.stringify({ error: "prm requis" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      try {
        if (!consentId) {
          if (!askId) {
            return new Response(JSON.stringify({ error: "consentId ou askId requis" }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          consentId = await sgGetConsentIdFromAsk(askId, prm);
        }

        const tryOneShot = async (reqType) => {
          console.log(`🚀 tryOneShot called with reqType: ${reqType}, prm: ${prm}, period: ${sinceStr} → ${untilStr}`);

          let order;
          if (reqType === "R65_SYNC") {
            order = await sgPostOrderR65Like("R65_SYNC", consentId, prm, sinceStr, untilStr);
          } else {
            order = await sgPostOrderR65Like("R65", consentId, prm, sinceStr, untilStr);
          }

          console.log(`📦 Order created:`, order.id || order.orderId);
          const orderId = order.id || order.orderId;

          let req = order.requests?.find((r) => r.type === reqType);
          console.log(`🔍 Request found:`, req ? `${req.id} (${req.status})` : 'not found');

          if (!req || req.status !== "SUCCESS") {
            // poller générique
            req = await sgPollOrderUntilSuccess(orderId, reqType);
          }

          // fetch data
          let dataTxt;
          if (req?.dataUrl) {
            const dr = await fetch(req.dataUrl);
            dataTxt = await dr.text();
            if (!dr.ok) throw new Error(`GET dataUrl failed ${dr.status}: ${dataTxt}`);
          } else {
            const url = `${SWITCHGRID_CONFIG.baseUrl}/request/${req.id}/data?since=${sinceStr}&until=${untilStr}&prm=${encodeURIComponent(prm)}`;
            const r = await fetch(url, {
              headers: { Authorization: `Bearer ${SWITCHGRID_CONFIG.token}` }
            });
            dataTxt = await r.text();
            if (!r.ok) throw new Error(`GET ${url} failed ${r.status}: ${dataTxt}`);
          }

          console.log(`📥 Received data text (first 200 chars): ${dataTxt.substring(0, 200)}`);
          const raw = JSON.parse(dataTxt);
          console.log('📊 Raw data structure:', JSON.stringify(raw).substring(0, 500));
          console.log('📊 Raw data keys:', Object.keys(raw));
          console.log('📊 Raw data type:', Array.isArray(raw) ? 'Array' : typeof raw);

          const rows = parseR65Switchgrid(raw);
          console.log(`📊 Parsed ${rows.length} rows from R65 data`);

          if (rows.length === 0) {
            console.error('❌ parseR65Switchgrid returned empty array!');
            console.error('❌ Check raw.grandeur:', raw.grandeur ? JSON.stringify(raw.grandeur).substring(0, 300) : 'undefined');
          }

          if (rows.length > 0) {
            console.log('📊 Sample row:', JSON.stringify(rows[0]));
          }

          // save
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          let saved = 0;

          if (supabaseUrl && supabaseServiceKey && rows.length > 0) {
            const supa = createClient(supabaseUrl, supabaseServiceKey);
            const mapped = rows.map((r) => ({
              user_id: userId,
              pdl: prm,
              date: r.date,
              energy_total_kwh: r.energy_total_kwh,
              energy_by_cadran: r.energy_by_cadran,
              source_order_id: orderId
            }));

            console.log(`💾 Attempting to upsert ${mapped.length} rows...`);
            console.log('💾 Sample mapped row:', JSON.stringify(mapped[0]));

            const { data, error: upErr } = await supa
              .from('switchgrid_consumption_daily')
              .upsert(mapped, { onConflict: 'pdl,date,user_id' });

            if (upErr) {
              console.error('❌ Upsert error (one-shot):', upErr);
              console.error('❌ Error details:', JSON.stringify(upErr));
            } else {
              console.log(`✅ R65 one-shot saved: ${mapped.length} rows`);
            }

            // On compte toujours les lignes mappées comme "saved" même si c'était un update
            saved = mapped.length;
          }

          return { orderId, requestId: req.id, count: rows.length, saved };
        };

        try {
          // 1/ One-shot en R65_SYNC
          const result = await tryOneShot("R65_SYNC");

          // Récupérer les données brutes pour le frontend
          const dataUrl = `${SWITCHGRID_CONFIG.baseUrl}/request/${result.requestId}/data?since=${sinceStr}&until=${untilStr}&prm=${encodeURIComponent(prm)}`;
          const rawRes = await fetch(dataUrl, {
            headers: { Authorization: `Bearer ${SWITCHGRID_CONFIG.token}` }
          });
          const rawData = await rawRes.json();

          return new Response(JSON.stringify({
            mode: 'one-shot',
            reqType: 'R65_SYNC',
            ...result,
            since: sinceStr,
            until: untilStr,
            raw: rawData
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (e) {
          console.warn('ℹ️ One-shot R65_SYNC a échoué, on tente R65. Raison:', String(e));

          // 2/ One-shot en R65
          const result = await tryOneShot("R65");

          // Récupérer les données brutes pour le frontend
          const dataUrl = `${SWITCHGRID_CONFIG.baseUrl}/request/${result.requestId}/data?since=${sinceStr}&until=${untilStr}&prm=${encodeURIComponent(prm)}`;
          const rawRes = await fetch(dataUrl, {
            headers: { Authorization: `Bearer ${SWITCHGRID_CONFIG.token}` }
          });
          const rawData = await rawRes.json();

          return new Response(JSON.stringify({
            mode: 'one-shot',
            reqType: 'R65',
            ...result,
            since: sinceStr,
            until: untilStr,
            raw: rawData
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      } catch (err) {
        console.error('❌ Error in create_order_r65_year_single:', err);
        return new Response(JSON.stringify({ error: err?.message || String(err) }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    console.log('❌ Unknown action:', action);
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Une erreur est survenue'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});