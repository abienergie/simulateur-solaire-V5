const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweGJ4ZnVja2xqcWR2a2FqbG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODc4MDMsImV4cCI6MjA2MTg2MzgwM30.7NKWDfbBdCzvH39BrZBUopr12V_bKUqnNI-OdR-MdIs';

async function testSubscriptionPrices() {
  try {
    const response = await fetch(
      'https://xpxbxfuckljqdvkajlmx.supabase.co/rest/v1/subscription_prices?select=*',
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    console.log('Données subscription_prices:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erreur:', error);
  }
}

testSubscriptionPrices();
