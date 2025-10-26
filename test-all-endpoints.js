const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweGJ4ZnVja2xqcWR2a2FqbG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODc4MDMsImV4cCI6MjA2MTg2MzgwM30.7NKWDfbBdCzvH39BrZBUopr12V_bKUqnNI-OdR-MdIs';
const BASE_URL = 'https://xpxbxfuckljqdvkajlmx.supabase.co';

async function testEndpoint(name, path) {
  console.log(`\n========== ${name} ==========`);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status}:`, response.statusText);
      return;
    }

    const data = await response.json();
    console.log(`✅ Nombre d'enregistrements:`, data.length);

    if (data.length > 0) {
      console.log('📋 Premier enregistrement:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

async function runTests() {
  console.log('🔍 Test des endpoints Supabase');
  console.log('🌐 Base:', BASE_URL);
  console.log('🔑 Clé ANON:', ANON_KEY.substring(0, 20) + '...');

  await testEndpoint('SUBSIDIES', '/rest/v1/subsidies?select=*');
  await testEndpoint('SUBSCRIPTION_PRICES', '/rest/v1/subscription_prices?select=*&limit=5');

  console.log('\n✅ Tests terminés');
}

runTests();
