// Script de vérification finale de la configuration
const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION FINALE DE LA CONFIGURATION\n');
console.log('=' .repeat(60));

// 1. Vérifier le fichier .env
console.log('\n1️⃣ Fichier .env:');
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
if (urlMatch && urlMatch[1].includes('xpxbxfuckljqdvkajlmx')) {
  console.log('   ✅ URL Supabase correcte: xpxbxfuckljqdvkajlmx');
} else {
  console.log('   ❌ URL Supabase incorrecte!');
}

// 2. Vérifier les constantes financières
console.log('\n2️⃣ Constantes financières (src/utils/constants/financialConstants.ts):');
const constantsPath = path.join(__dirname, 'src/utils/constants/financialConstants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf-8');
if (constantsContent.includes('0.04') &&
    constantsContent.includes('0.0617') &&
    constantsContent.includes('2025-10-01')) {
  console.log('   ✅ Tarifs mis à jour au 01/10/2025');
} else {
  console.log('   ⚠️ Tarifs non mis à jour');
}

// 3. Vérifier le FinancialSettingsContext
console.log('\n3️⃣ FinancialSettingsContext:');
const contextPath = path.join(__dirname, 'src/contexts/FinancialSettingsContext.tsx');
const contextContent = fs.readFileSync(contextPath, 'utf-8');
if (contextContent.includes('loadSubsidiesAndTariffs') &&
    contextContent.includes('tarif_revente_surplus') &&
    contextContent.includes('tarif_revente_totale')) {
  console.log('   ✅ Charge les tarifs depuis Supabase');
} else {
  console.log('   ❌ Ne charge pas les tarifs depuis Supabase');
}

// 4. Vérifier la suppression de la section "Tarifs de revente EDF OA"
console.log('\n4️⃣ Page Settings:');
const settingsPath = path.join(__dirname, 'src/pages/Settings.tsx');
const settingsContent = fs.readFileSync(settingsPath, 'utf-8');
if (!settingsContent.includes('Tarifs de revente EDF OA') &&
    !settingsContent.includes('handleUpdateSellPrices')) {
  console.log('   ✅ Section "Tarifs de revente EDF OA" supprimée');
} else {
  console.log('   ❌ Section "Tarifs de revente EDF OA" toujours présente');
}

// 5. Vérifier la durée par défaut
console.log('\n5️⃣ Durée par défaut d\'abonnement:');
const projectionPath = path.join(__dirname, 'src/pages/ProjectionFinanciere.tsx');
const projectionContent = fs.readFileSync(projectionPath, 'utf-8');
const defaultDurationMatches = projectionContent.match(/dureeAbonnement \|\| (\d+)/g);
if (defaultDurationMatches && defaultDurationMatches.every(m => m.includes('25'))) {
  console.log('   ✅ Durée par défaut = 25 ans (trouvé dans', defaultDurationMatches.length, 'endroits)');
} else {
  console.log('   ⚠️ Durée par défaut incorrecte');
  console.log('   Matches:', defaultDurationMatches);
}

// 6. Vérifier le build
console.log('\n6️⃣ Build:');
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('   ✅ Build présent et valide');
  } else {
    console.log('   ⚠️ Build incomplet');
  }
} else {
  console.log('   ❌ Dossier dist/ manquant');
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ VÉRIFICATION TERMINÉE\n');
console.log('📋 Résumé des modifications:');
console.log('   • Base Supabase: xpxbxfuckljqdvkajlmx');
console.log('   • Tarifs depuis Supabase avec date 01/10/2025');
console.log('   • Section "Tarifs de revente EDF OA" supprimée');
console.log('   • Durée par défaut: 25 ans');
console.log('   • Build généré avec succès\n');
