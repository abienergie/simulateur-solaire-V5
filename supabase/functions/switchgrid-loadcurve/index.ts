import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SWITCHGRID_CONFIG = {
  baseUrl: 'https://app.switchgrid.tech/enedis/v2',
  token: 'c85136b872194092cf9d013c6fe6ce5c'
};

console.log('🚀 Switchgrid LOADCURVE Function Ready');
console.log('🔑 Token configured:', SWITCHGRID_CONFIG.token ? 'Yes' : 'No');

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollOrder(orderId: string, requestType: string, maxAttempts = 60) {
  console.log(`⏳ Polling order ${orderId} for ${requestType}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`${SWITCHGRID_CONFIG.baseUrl}/order/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${SWITCHGRID_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to get order status: ${response.status} ${text}`);
    }

    const order = await response.json();
    const request = order?.requests?.find((r: any) => r.type === requestType);

    if (!request) {
      throw new Error(`Request ${requestType} not found in order`);
    }

    console.log(`  Attempt ${attempt}: ${request.status}`);

    if (request.status === 'SUCCESS') {
      console.log(`✅ Request completed successfully`);
      return request;
    }

    if (request.status === 'FAILED') {
      throw new Error(`Request failed: ${request.errorMessage || 'Unknown error'}`);
    }

    await sleep(3000);
  }

  throw new Error(`Timeout waiting for ${requestType} to complete`);
}

function parseLoadCurveData(raw: any) {
  console.log('🔧 Parsing LOADCURVE data...');
  console.log('🔍 Raw data structure:', JSON.stringify(raw, null, 2));

  if (!raw || !raw.grandeur) {
    console.error('❌ No grandeur in data');
    return [];
  }

  const grandeurs = Array.isArray(raw.grandeur) ? raw.grandeur : [raw.grandeur];
  console.log(`📦 Found ${grandeurs.length} grandeur(s)`);

  const powerGrandeur = grandeurs.find((g: any) => {
    const metier = (g.grandeurMetier || '').toUpperCase();
    const physique = (g.grandeurPhysique || '').toUpperCase();

    console.log(`🔎 Checking grandeur: metier="${metier}", physique="${physique}"`);

    return (
      physique === 'P' ||
      physique === 'PA' ||
      physique === 'PACT' ||
      metier.includes('PUISSANCE') ||
      metier.includes('ACTIVE')
    );
  });

  if (!powerGrandeur) {
    console.error('❌ No power grandeur found');
    console.error('Available grandeurs:', grandeurs.map((g: any) =>
      `${g.grandeurMetier}/${g.grandeurPhysique}`
    ));
    return [];
  }

  console.log(`✅ Found grandeur: ${powerGrandeur.grandeurMetier}`);

  const points = powerGrandeur.points || [];
  const unit = (powerGrandeur.unite || '').toLowerCase();

  console.log(`📊 Processing ${points.length} points (unit: ${unit})`);

  const rows = points.map((p: any) => {
    const datetime = p.d || p.date || p.datetime;
    const value = Number(p.v ?? p.value ?? 0);
    const powerKw = Math.round((value / 1000) * 1000) / 1000;

    return {
      datetime,
      power_kw: powerKw
    };
  });

  console.log(`✅ Parsed ${rows.length} rows`);
  return rows;
}

Deno.serve(async (req) => {
  console.log(`📨 ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    console.log('📦 Request body:', body);

    const {
      action,
      prm,
      consent_id,
      start_date,
      end_date,
      returnRows = true,
      period = '30m'
    } = body;

    if (action === 'create_loadcurve_order_and_poll') {
      if (!prm || !consent_id) {
        return new Response(JSON.stringify({
          error: 'prm and consent_id are required'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const sinceDate = start_date || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const untilDate = end_date || new Date().toISOString().split('T')[0];

      console.log(`📅 Creating LOADCURVE order: ${sinceDate} → ${untilDate}`);

      const orderPayload = {
        consentId: consent_id,
        requests: [{
          type: 'LOADCURVE',
          direction: 'CONSUMPTION',
          prms: [prm],
          since: sinceDate,
          until: untilDate
        }]
      };

      console.log('📤 POST /order:', orderPayload);

      const orderResponse = await fetch(`${SWITCHGRID_CONFIG.baseUrl}/order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SWITCHGRID_CONFIG.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      const orderText = await orderResponse.text();

      if (!orderResponse.ok) {
        console.error(`❌ Order creation failed: ${orderResponse.status} ${orderText}`);
        return new Response(JSON.stringify({
          error: 'Failed to create order',
          status: orderResponse.status,
          details: orderText
        }), {
          status: orderResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const order = JSON.parse(orderText);
      console.log(`✅ Order created: ${order.id}`);

      const request = await pollOrder(order.id, 'LOADCURVE');

      if (returnRows) {
        console.log(`📥 Fetching data from /request/${request.id}/data with period=${period}...`);

        // Utiliser l'endpoint /request/{requestId}/data avec le paramètre period
        const dataUrl = `${SWITCHGRID_CONFIG.baseUrl}/request/${request.id}/data?period=${period}&format=json`;
        console.log(`🔗 Data URL: ${dataUrl}`);

        const dataResponse = await fetch(dataUrl, {
          headers: {
            'Authorization': `Bearer ${SWITCHGRID_CONFIG.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!dataResponse.ok) {
          const errorText = await dataResponse.text();
          throw new Error(`Failed to fetch data: ${dataResponse.status} ${errorText}`);
        }

        const rawData = await dataResponse.json();
        const rows = parseLoadCurveData(rawData);

        return new Response(JSON.stringify({
          success: true,
          orderId: order.id,
          requestId: request.id,
          count: rows.length,
          rows: rows,
          period: { start: sinceDate, end: untilDate }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          success: true,
          orderId: order.id,
          requestId: request.id,
          dataUrl: request.dataUrl,
          period: { start: sinceDate, end: untilDate }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (action === 'fetch_data_url') {
      const { dataUrl, parse = true } = body;

      if (!dataUrl) {
        return new Response(JSON.stringify({ error: 'dataUrl required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('📥 Fetching from dataUrl...');
      const dataResponse = await fetch(dataUrl);

      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch data: ${dataResponse.status}`);
      }

      const rawData = await dataResponse.json();

      if (parse) {
        const rows = parseLoadCurveData(rawData);
        return new Response(JSON.stringify({
          success: true,
          count: rows.length,
          rows: rows
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify(rawData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({
      error: 'Unknown action. Use: create_loadcurve_order_and_poll or fetch_data_url'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error',
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});