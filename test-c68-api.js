/**
 * Script de test pour l'API Switchgrid C68
 *
 * Ce script permet de tester la récupération des données C68 (détails du contrat)
 * en appelant directement l'edge function Supabase.
 *
 * Usage:
 *   node test-c68-api.js
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Configuration de test - À MODIFIER avec vos données réelles
const TEST_CONFIG = {
  // ID de la requête C68 (obtenu après avoir créé un order)
  requestId: 'VOTRE_REQUEST_ID_C68',
  // PRM (Point de Référence et de Mesure) - le numéro de compteur
  prm: 'VOTRE_PRM',
};

async function testC68Retrieval() {
  console.log('🧪 Test de récupération des données C68');
  console.log('=' .repeat(50));

  if (TEST_CONFIG.requestId === 'VOTRE_REQUEST_ID_C68') {
    console.error('❌ Erreur: Veuillez configurer TEST_CONFIG avec vos données réelles');
    console.log('\nPour obtenir le requestId:');
    console.log('1. Créez un order avec une requête C68');
    console.log('2. Vérifiez le statut de l\'order');
    console.log('3. Récupérez l\'ID de la requête C68 depuis la réponse');
    process.exit(1);
  }

  try {
    console.log('\n📊 Configuration:');
    console.log('  - Request ID:', TEST_CONFIG.requestId);
    console.log('  - PRM:', TEST_CONFIG.prm);
    console.log('  - Supabase URL:', SUPABASE_URL);
    console.log('  - Edge Function:', 'switchgrid-orders');

    console.log('\n📡 Appel de l\'edge function...\n');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/switchgrid-orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_request_data',
          requestId: TEST_CONFIG.requestId,
          requestType: 'C68',
          params: {
            format: 'json',
            prm: TEST_CONFIG.prm
          }
        })
      }
    );

    console.log('📥 Réponse reçue:');
    console.log('  - Status:', response.status, response.statusText);
    console.log('  - Content-Type:', response.headers.get('Content-Type'));

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Erreur API:', data);
      process.exit(1);
    }

    console.log('\n✅ Données C68 récupérées avec succès!\n');
    console.log('📦 Données du contrat:');
    console.log(JSON.stringify(data, null, 2));

    // Afficher quelques informations clés si disponibles
    if (data) {
      console.log('\n📋 Résumé des informations:');
      if (data.prm) console.log('  - PRM:', data.prm);
      if (data.address) console.log('  - Adresse:', data.address);
      if (data.formule_tarifaire_acheminement) {
        console.log('  - Formule tarifaire:', data.formule_tarifaire_acheminement);
      }
      if (data.puissance_souscrite) {
        console.log('  - Puissance souscrite:', data.puissance_souscrite, 'kVA');
      }
    }

    console.log('\n✅ Test réussi!');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.error('\nDétails de l\'erreur:');
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le test
testC68Retrieval();
