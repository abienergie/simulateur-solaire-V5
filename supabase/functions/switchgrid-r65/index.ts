import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const SWITCHGRID_API_KEY = Deno.env.get('SWITCHGRID_API_KEY');
const SWITCHGRID_BASE_URL = 'https://app.switchgrid.tech/enedis/v2';

console.log('🚀 Switchgrid R65 Function Ready');

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollOrder(orderId: string, requestType: string, maxAttempts = 45) {
  console.log(`⏳ Polling order ${orderId} for ${requestType}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`${SWITCHGRID_BASE_URL}/order/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${SWITCHGRID_API_KEY}`,
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

    await sleep(2000);
  }

  throw new Error(`Timeout waiting for ${requestType} to complete`);
}

function parseR65Data(raw: any) {
  console.log('🔧 Parsing R65 data...');

  if (!raw || !raw.grandeur) {
    console.error('❌ No grandeur in data');
    return [];
  }

  const grandeurs = Array.isArray(raw.grandeur) ? raw.grandeur : [raw.grandeur];

  const consumptionGrandeur = grandeurs.find((g: any) => {
    const metier = (g.grandeurMetier || '').toUpperCase();
    const physique = (g.grandeurPhysique || '').toUpperCase();
    return (metier.includes('CONS') || metier.includes('CONSO')) &&
           (physique === 'EA' || physique === 'E');
  });

  if (!consumptionGrandeur) {
    console.error('❌ No consumption grandeur found');
    console.error('Available:', grandeurs.map((g: any) =>
      `${g.grandeurMetier}/${g.grandeurPhysique}`
    ));
    return [];
  }

  console.log(`✅ Found grandeur: ${consumptionGrandeur.grandeurMetier}`);

  const points = consumptionGrandeur.points || [];
  const unit = (consumptionGrandeur.unite || '').toLowerCase();
  const factor = unit === 'wh' ? 1 / 1000 : 1;

  console.log(`📊 Processing ${points.length} points (unit: ${unit})`);

  const rows = points.map((p: any) => {
    const date = p.d || p.date;
    const value = Number(p.v ?? p.value ?? 0);
    const energyKwh = Math.round(value * factor * 1000) / 1000;

    return {
      date,
      energy_total_kwh: energyKwh,
      energy_by_cadran: { BASE: energyKwh }
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
    if (!SWITCHGRID_API_KEY) {
      throw new Error('SWITCHGRID_API_KEY not configured');
    }

    const body = await req.json();
    console.log('📦 Request body:', body);

    const {
      action,
      prm,
      consent_id,
      start_date,
      end_date,
      returnRows = true
    } = body;

    if (action === 'create_r65_order_and_poll') {
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

      console.log(`📅 Creating R65 order: ${sinceDate} → ${untilDate}`);

      const orderPayload = {
        consentId: consent_id,
        requests: [{
          type: 'R65_SYNC',
          prms: [prm],
          since: sinceDate,
          until: untilDate
        }]
      };

      console.log('📤 POST /order:', orderPayload);

      const orderResponse = await fetch(`${SWITCHGRID_BASE_URL}/order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SWITCHGRID_API_KEY}`,
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

      const request = await pollOrder(order.id, 'R65_SYNC');

      if (returnRows) {
        console.log('📥 Fetching data from dataUrl...');
        const dataUrl = request.dataUrl;

        if (!dataUrl) {
          throw new Error('No dataUrl in completed request');
        }

        const dataResponse = await fetch(dataUrl);
        if (!dataResponse.ok) {
          throw new Error(`Failed to fetch data: ${dataResponse.status}`);
        }

        const rawData = await dataResponse.json();
        const rows = parseR65Data(rawData);

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
        const rows = parseR65Data(rawData);
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
      error: 'Unknown action. Use: create_r65_order_and_poll or fetch_data_url'
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
