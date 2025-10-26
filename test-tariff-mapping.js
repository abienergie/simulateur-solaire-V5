// Test du mapping des tarifs par tranche de puissance

const subsidiesData = [
  {
    id: 1,
    power_range: '0-3',
    amount: 80,
    effective_date: '2025-10-01',
    tarif_revente_totale: 0,
    tarif_revente_surplus: 0.04
  },
  {
    id: 2,
    power_range: '3-9',
    amount: 100,
    effective_date: '2025-10-01',
    tarif_revente_totale: 0,
    tarif_revente_surplus: 0.04
  },
  {
    id: 3,
    power_range: '9-36',
    amount: 80,
    effective_date: '2025-10-01',
    tarif_revente_totale: 0.1049,
    tarif_revente_surplus: 0.0617
  },
  {
    id: 4,
    power_range: '36-100',
    amount: 40,
    effective_date: '2025-10-01',
    tarif_revente_totale: 0.0912,
    tarif_revente_surplus: 0.0617
  }
];

console.log('🧪 Test du mapping des tarifs\n');
console.log('=' .repeat(80));

// Simuler le code du FinancialSettingsContext
const under9kwSubsidy = subsidiesData.find(s => {
  const [min, max] = s.power_range.split('-').map(Number);
  return max <= 9;
});

const from9to36kwSubsidy = subsidiesData.find(s => {
  const [min, max] = s.power_range.split('-').map(Number);
  return min >= 9 && max <= 36;
});

const from36to100kwSubsidy = subsidiesData.find(s => {
  const [min, max] = s.power_range.split('-').map(Number);
  return min >= 36;
});

const surplusSellPrices = {
  under9kw: under9kwSubsidy?.tarif_revente_surplus,
  from9to36kw: from9to36kwSubsidy?.tarif_revente_surplus,
  from36to100kw: from36to100kwSubsidy?.tarif_revente_surplus
};

const totalSellPrices = {
  under9kw: under9kwSubsidy?.tarif_revente_totale,
  from9to36kw: from9to36kwSubsidy?.tarif_revente_totale,
  from36to100kw: from36to100kwSubsidy?.tarif_revente_totale
};

console.log('\n📊 RÉSULTAT DU MAPPING:');
console.log('\n1️⃣ TARIFS DE REVENTE DU SURPLUS:');
console.log(`   ≤ 9 kWc:      ${surplusSellPrices.under9kw} €/kWh`);
console.log(`   9-36 kWc:     ${surplusSellPrices.from9to36kw} €/kWh`);
console.log(`   36-100 kWc:   ${surplusSellPrices.from36to100kw} €/kWh`);

console.log('\n2️⃣ TARIFS DE REVENTE TOTALE:');
console.log(`   ≤ 9 kWc:      ${totalSellPrices.under9kw} €/kWh`);
console.log(`   9-36 kWc:     ${totalSellPrices.from9to36kw} €/kWh`);
console.log(`   36-100 kWc:   ${totalSellPrices.from36to100kw} €/kWh`);

console.log('\n' + '=' .repeat(80));

// Validation
const expectedSurplus = {
  under9kw: 0.04,
  from9to36kw: 0.0617,
  from36to100kw: 0.0617
};

const expectedTotal = {
  under9kw: 0,
  from9to36kw: 0.1049,
  from36to100kw: 0.0912
};

let allCorrect = true;

console.log('\n✅ VALIDATION:\n');

// Vérifier surplus
if (surplusSellPrices.under9kw === expectedSurplus.under9kw) {
  console.log('   ✅ Surplus ≤9kWc correct');
} else {
  console.log(`   ❌ Surplus ≤9kWc incorrect (attendu: ${expectedSurplus.under9kw}, obtenu: ${surplusSellPrices.under9kw})`);
  allCorrect = false;
}

if (surplusSellPrices.from9to36kw === expectedSurplus.from9to36kw) {
  console.log('   ✅ Surplus 9-36kWc correct');
} else {
  console.log(`   ❌ Surplus 9-36kWc incorrect (attendu: ${expectedSurplus.from9to36kw}, obtenu: ${surplusSellPrices.from9to36kw})`);
  allCorrect = false;
}

if (surplusSellPrices.from36to100kw === expectedSurplus.from36to100kw) {
  console.log('   ✅ Surplus 36-100kWc correct');
} else {
  console.log(`   ❌ Surplus 36-100kWc incorrect (attendu: ${expectedSurplus.from36to100kw}, obtenu: ${surplusSellPrices.from36to100kw})`);
  allCorrect = false;
}

// Vérifier total
if (totalSellPrices.under9kw === expectedTotal.under9kw) {
  console.log('   ✅ Total ≤9kWc correct');
} else {
  console.log(`   ❌ Total ≤9kWc incorrect (attendu: ${expectedTotal.under9kw}, obtenu: ${totalSellPrices.under9kw})`);
  allCorrect = false;
}

if (totalSellPrices.from9to36kw === expectedTotal.from9to36kw) {
  console.log('   ✅ Total 9-36kWc correct');
} else {
  console.log(`   ❌ Total 9-36kWc incorrect (attendu: ${expectedTotal.from9to36kw}, obtenu: ${totalSellPrices.from9to36kw})`);
  allCorrect = false;
}

if (totalSellPrices.from36to100kw === expectedTotal.from36to100kw) {
  console.log('   ✅ Total 36-100kWc correct');
} else {
  console.log(`   ❌ Total 36-100kWc incorrect (attendu: ${expectedTotal.from36to100kw}, obtenu: ${totalSellPrices.from36to100kw})`);
  allCorrect = false;
}

console.log('\n' + '=' .repeat(80));

if (allCorrect) {
  console.log('\n🎉 TOUS LES TARIFS SONT CORRECTEMENT MAPPÉS !');
  console.log('\n📝 Pour une installation de 12 kWc (tranche 9-36kWc):');
  console.log(`   - Tarif surplus: ${surplusSellPrices.from9to36kw} €/kWh ✅`);
  console.log(`   - Tarif total:   ${totalSellPrices.from9to36kw} €/kWh ✅`);
} else {
  console.log('\n❌ ERREUR: Certains tarifs sont incorrects');
}

console.log('');
