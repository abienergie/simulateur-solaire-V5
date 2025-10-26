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

function parseLoadCurveData(raw: any) {
  console.log('🔧 Parsing LOADCURVE data...');
  console.log('🔍 Raw data type:', typeof raw);
  console.log('🔍 Raw data keys:', Object.keys(raw || {}));

  // Format 1: Format avec period, startsAt, endsAt, values
  if (raw.period && raw.startsAt && raw.values && Array.isArray(raw.values)) {
    console.log('✅ Detected Format 1: period/startsAt/values');

    const startDate = new Date(raw.startsAt);
    const values = raw.values;

    // Extraire le period en secondes (ex: "PT1800S" = 1800 secondes = 30 minutes)
    const periodMatch = raw.period.match(/PT(\d+)S/);
    const periodSeconds = periodMatch ? parseInt(periodMatch[1]) : 1800;

    console.log(`📊 Processing ${values.length} values with period ${periodSeconds}s`);

    const rows = values.map((value: number, index: number) => {
      const timestamp = new Date(startDate.getTime() + (index * periodSeconds * 1000));

      return {
        timestamp: timestamp.toISOString(),
        value: Math.round((value / 1000) * 1000) / 1000, // Convertir W en kW
        unit: 'kW'
      };
    });

    console.log(`✅ Parsed ${rows.length} rows`);
    return rows;
  }

  // Format 2: Format avec grandeur (ancien format)
  if (raw.grandeur) {
    console.log('✅ Detected Format 2: grandeur format');

    const grandeurs = Array.isArray(raw.grandeur) ? raw.grandeur : [raw.grandeur];
    console.log(`📦 Found ${grandeurs.length} grandeur(s)`);

    const powerGrandeur = grandeurs.find((g: any) => {
      const metier = (g.grandeurMetier || '').toUpperCase();
      const physique = (g.grandeurPhysique || '').toUpperCase();

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
      return [];
    }

    console.log(`✅ Found grandeur: ${powerGrandeur.grandeurMetier}`);

    const points = powerGrandeur.points || [];
    const unit = (powerGrandeur.unite || '').toLowerCase();

    console.log(`📊 Processing ${points.length} points (unit: ${unit})`);

    const rows = points.map((p: any) => {
      const datetime = p.d || p.date || p.datetime;
      const value = Number(p.v ?? p.value ?? 0);

      // Convertir en kW si nécessaire
      let powerKw = value;
      if (unit === 'w' || unit === 'watt') {
        powerKw = value / 1000;
      }

      return {
        timestamp: datetime,
        value: Math.round(powerKw * 1000) / 1000,
        unit: 'kW'
      };
    });

    console.log(`✅ Parsed ${rows.length} rows`);
    return rows;
  }

  console.error('❌ Unknown data format');
  console.error('Raw data sample:', JSON.stringify(raw).substring(0, 500));
  return [];
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

    const { requestId, format = 'json', period = '30min' } = body;

    if (!requestId) {
      return new Response(JSON.stringify({
        error: 'requestId is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Construire l'URL avec les paramètres
    const dataUrl = `${SWITCHGRID_CONFIG.baseUrl}/request/${requestId}/data?period=${period}&format=${format}`;
    console.log(`📥 Fetching data from: ${dataUrl}`);

    const dataResponse = await fetch(dataUrl, {
      headers: {
        'Authorization': `Bearer ${SWITCHGRID_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      console.error(`❌ Failed to fetch data: ${dataResponse.status} ${errorText}`);
      return new Response(JSON.stringify({
        error: 'Failed to fetch request data',
        status: dataResponse.status,
        details: errorText
      }), {
        status: dataResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Si format CSV, retourner tel quel
    if (format === 'csv') {
      const csvData = await dataResponse.text();
      console.log(`✅ CSV data received (${csvData.length} characters)`);

      return new Response(csvData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="courbe-de-charge-${requestId}.csv"`
        }
      });
    }

    // Si format JSON, parser et transformer
    const rawData = await dataResponse.json();
    console.log('📦 Raw JSON received:', JSON.stringify(rawData).substring(0, 200));

    const parsedData = parseLoadCurveData(rawData);

    console.log(`✅ JSON data parsed: ${parsedData.length} points`);

    return new Response(JSON.stringify(parsedData), {
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