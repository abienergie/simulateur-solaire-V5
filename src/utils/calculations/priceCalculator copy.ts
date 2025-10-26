import { SubsidyRanges, Subsidy } from '../../types/subsidies';
import { FinancialSettings } from '../../types/financial';
import { createClient } from '@supabase/supabase-js';

// Client Supabase pour les tables externes (subscription_prices)
const EXTERNAL_SUPABASE_URL = 'https://xpxbxfuckljqdvkajlmx.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweGJ4ZnVja2xqcWR2a2FqbG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODc4MDMsImV4cCI6MjA2MTg2MzgwM30.7NKWDfbBdCzvH39BrZBUopr12V_bKUqnNI-OdR-MdIs';

const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);


// Prix par défaut des installations en fonction de la puissance
const DEFAULT_PRICES: { [key: number]: number } = {
  2.5: 5990,
  3.0: 6990,
  3.5: 7990,
  4.0: 8990,
  4.5: 9990,
  5.0: 10990,
  5.5: 11990,
  6.0: 12990,
  6.5: 13690,
  7.0: 14390,
  7.5: 14990,
  8.0: 15690,
  8.5: 16390,
  9.0: 16990,
  12.0: 20790,
  15.0: 24890,
  18.0: 28890,
  20.0: 32990,
  25.0: 41390,
  30.0: 49690,
  36.0: 59590
};

// Function to get custom prices from localStorage with improved error handling
function getCustomPrices(): Array<{ power: number; price: number }> {
  try {
    const savedPrices = localStorage.getItem('installation_prices');
    if (!savedPrices) {
      console.log('No custom prices found in localStorage');
      return [];
    }

    let prices;
    try {
      prices = JSON.parse(savedPrices);
    } catch (parseError) {
      console.error('Invalid JSON in localStorage:', parseError);
      localStorage.removeItem('installation_prices'); // Clear invalid data
      return [];
    }

    if (!Array.isArray(prices)) {
      console.warn('Custom prices must be an array');
      return [];
    }

    // Validate and filter prices
    const validPrices = prices.filter(p => 
      typeof p === 'object' &&
      p !== null &&
      typeof p.power === 'number' && 
      typeof p.price === 'number' &&
      p.power > 0 && 
      p.price > 0
    );

    // Sort by power for consistency
    validPrices.sort((a, b) => a.power - b.power);

    console.log('Loaded custom prices:', validPrices);
    return validPrices;
  } catch (error) {
    console.error('Error loading custom prices:', error);
    return [];
  }
}

// Function to save custom price with validation
export function saveCustomPrice(power: number, price: number): void {
  try {
    const currentPrices = getCustomPrices();
    const priceIndex = currentPrices.findIndex(p => Math.abs(p.power - power) < 0.01);
    
    if (priceIndex >= 0) {
      currentPrices[priceIndex].price = price;
    } else {
      currentPrices.push({ power, price });
    }
    
    currentPrices.sort((a, b) => a.power - b.power);
    localStorage.setItem('installation_prices', JSON.stringify(currentPrices));
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('customPricesUpdated', {
      detail: currentPrices // Ne dispatcher que les prix modifiés, pas tous les prix
    }));
    
    console.log('Saved custom price:', { power, price });
  } catch (error) {
    console.error('Error saving custom price:', error);
    throw error;
  }
}

export function calculateSubsidy(power: number, settings: any): number {
  if (!settings?.subsidies?.length) {
    console.log('No subsidies found in settings');
    return 0;
  }
  
  console.log('Calculating subsidy for power:', power, 'kWc');
  
  const applicableSubsidy = settings.subsidies.find((subsidy: any) => {
    const min = subsidy.min;
    const max = subsidy.max;

    if (typeof min !== 'number' || typeof max !== 'number') {
      console.log('Subsidy ignored due to invalid min/max:', {min, max});
      return false;
    }

    const isApplicable = power >= min && power <= max;
    console.log(`Checking range ${min}-${max}kWc:`, isApplicable ? 'applicable' : 'not applicable');
    return isApplicable;
  });

  if (!applicableSubsidy) {
    console.log('No applicable subsidy found for this power');
    return 0;
  }

  console.log('Found applicable subsidy:', applicableSubsidy);
  
  const amount = Math.round(applicableSubsidy.amount * power);
  console.log('Calculated subsidy amount:', amount, '€');
  
  return amount;
}

export function getPriceFromPower(power: number): number {
  // Round power to nearest 0.5
  const roundedPower = Math.round(power * 2) / 2;
  console.log(`Getting price for ${roundedPower} kWc`);

  // Get custom prices with validation
  const customPrices = getCustomPrices();
  
  // First try exact match in custom prices
  const exactMatch = customPrices.find(p => Math.abs(p.power - roundedPower) < 0.01);
  if (exactMatch) {
    console.log(`Found exact custom price match: ${exactMatch.price}€ for ${exactMatch.power} kWc`);
    return exactMatch.price;
  }

  // For standard kits (≤ 9 kWc), use default price
  if (roundedPower <= 9) {
    const defaultPrice = DEFAULT_PRICES[roundedPower];
    if (!defaultPrice) {
      console.warn(`No default price found for ${roundedPower} kWc`);
      return 0;
    }
    console.log(`Using default price for ${roundedPower} kWc: ${defaultPrice}€`);
    return defaultPrice;
  }

  // For pro kits (> 9 kWc), use default price if available, otherwise find closest custom price
  const proPrices = customPrices.filter(p => p.power > 9);
  
  // First check if we have a default price for this pro kit
  const defaultPrice = DEFAULT_PRICES[roundedPower];
  if (defaultPrice) {
    console.log(`Using default price for pro kit ${roundedPower} kWc: ${defaultPrice}€`);
    return defaultPrice;
  }
  
  if (proPrices.length > 0) {
    // Try to find exact match first
    const exactProMatch = proPrices.find(p => Math.abs(p.power - roundedPower) < 0.01);
    if (exactProMatch) {
      console.log(`Found exact pro price match: ${exactProMatch.price}€ for ${exactProMatch.power} kWc`);
      return exactProMatch.price;
    }
    
    // If no exact match, find the closest price for pro kits
    const closestProPrice = proPrices.reduce((prev, curr) => {
      return Math.abs(curr.power - roundedPower) < Math.abs(prev.power - roundedPower) ? curr : prev;
    });
    
    console.log(`Using closest pro price: ${closestProPrice.price}€ for ${closestProPrice.power} kWc (requested: ${roundedPower} kWc)`);
    return closestProPrice.price;
  }

  console.warn(`No price found for ${roundedPower} kWc`);
  return 0;
}

let isLoadingPrices = false;
let loadingPromise: Promise<void> | null = null;

// Prix d'abonnement par défaut (fallback)
const FALLBACK_SUBSCRIPTION_PRICES: {[key: string]: {[key: number]: number}} = {
  '25': {
    2.5: 49.00, 3.0: 59.00, 3.5: 68.50, 4.0: 78.00, 4.5: 87.00,
    5.0: 96.00, 5.5: 105.50, 6.0: 115.00, 6.5: 124.00,
    7.0: 132.00, 7.5: 140.00, 8.0: 149.00, 8.5: 158.00, 9.0: 167.00,
    12.0: 195.70, 15.0: 243.50, 18.0: 290.00, 20.0: 320.00,
    25.0: 395.00, 30.0: 470.00, 36.0: 560.00
  },
  '20': {
    2.5: 51.60, 3.0: 63.60, 3.5: 72.00, 4.0: 82.80, 4.5: 92.00,
    5.0: 100.80, 5.5: 111.60, 6.0: 120.00, 6.5: 129.60,
    7.0: 138.00, 7.5: 146.40, 8.0: 156.00, 8.5: 164.40, 9.0: 174.00,
    12.0: 210.50, 15.0: 260.60, 18.0: 310.00, 20.0: 340.00,
    25.0: 420.00, 30.0: 500.00, 36.0: 595.00
  },
  '15': {
    2.5: 56.40, 3.0: 73.20, 3.5: 80.40, 4.0: 91.20, 4.5: 102.00,
    5.0: 111.60, 5.5: 122.40, 6.0: 130.80, 6.5: 142.80,
    7.0: 150.00, 7.5: 159.60, 8.0: 169.20, 8.5: 177.60, 9.0: 189.60,
    12.0: 237.00, 15.0: 291.80, 18.0: 340.00, 20.0: 375.00,
    25.0: 460.00, 30.0: 550.00, 36.0: 655.00
  },
  '10': {
    2.5: 67.20, 3.0: 86.40, 3.5: 97.20, 4.0: 106.80, 4.5: 120.00,
    5.0: 134.40, 5.5: 144.00, 6.0: 153.60, 6.5: 165.60,
    7.0: 174.00, 7.5: 178.80, 8.0: 192.00, 8.5: 200.40, 9.0: 206.40,
    12.0: 297.60, 15.0: 363.60, 18.0: 420.00, 20.0: 460.00,
    25.0: 570.00, 30.0: 680.00, 36.0: 810.00
  }
};

// Cache pour les prix Supabase
let subscriptionPricesCache: {[key: string]: {[key: number]: number}} | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 secondes pour voir les changements plus rapidement

// Fonction synchrone pour obtenir les prix d'abonnement
export function getSubscriptionPrice(power: number, duration: number): number {
  const roundedPower = Math.round(power * 2) / 2;
  
  // Utiliser le cache Supabase s'il est disponible et valide
  if (subscriptionPricesCache) {
    console.log('🔍 Recherche prix pour', roundedPower, 'kWc,', duration, 'ans dans cache Supabase');
    console.log('📊 Cache disponible:', Object.keys(subscriptionPricesCache));
    console.log('📊 Puissances disponibles pour', duration, 'ans:', Object.keys(subscriptionPricesCache[duration.toString()] || {}));
    
    const price = subscriptionPricesCache[duration.toString()]?.[roundedPower];
    if (price) {
      console.log('✅ Prix trouvé dans cache Supabase:', price, '€');
      return price;
    } else {
      console.log('❌ Prix non trouvé dans cache Supabase pour', roundedPower, 'kWc');
    }
  }
  
  console.log('🔄 Fallback sur prix par défaut pour', roundedPower, 'kWc,', duration, 'ans');
  // Fallback sur les prix par défaut
  const fallbackPrice = FALLBACK_SUBSCRIPTION_PRICES[duration.toString()]?.[roundedPower] || 0;
  console.log('📋 Prix fallback:', fallbackPrice, '€');
  return fallbackPrice;
}

// Fonction pour charger les prix depuis Supabase en arrière-plan
async function loadSubscriptionPricesFromSupabase(): Promise<void> {
  if (isLoadingPrices && loadingPromise) {
    await loadingPromise;
    return;
  }

  isLoadingPrices = true;
  loadingPromise = (async () => {
    try {
      console.log('🔄 Chargement des prix d\'abonnement depuis Supabase...');
      
      // Ajouter un timeout et une gestion d'erreur améliorée
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout
      
      const { data, error } = await externalSupabase
        .from('subscription_prices')
        .select('*')
        .order('power_kwc')
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.warn('⚠️ Erreur Supabase (utilisation du fallback):', error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ Aucune donnée de prix d\'abonnement trouvée (utilisation du fallback)');
        return;
      }
      
      // Convertir les données en format cache
      const newCache: {[key: string]: {[key: number]: number}} = {
        '25': {},
        '20': {},
        '15': {},
        '10': {}
      };
      
      data.forEach(row => {
        const power = parseFloat(row.power_kwc);
        newCache['25'][power] = parseFloat(row.duration_25_years);
        newCache['20'][power] = parseFloat(row.duration_20_years);
        newCache['15'][power] = parseFloat(row.duration_15_years);
        newCache['10'][power] = parseFloat(row.duration_10_years);
      });
      
      subscriptionPricesCache = newCache;
      cacheTimestamp = Date.now();
      
      console.log('✅ Prix d\'abonnement chargés depuis Supabase:', Object.keys(newCache['25']).length, 'puissances');
      
      // Déclencher un événement pour notifier les composants
      window.dispatchEvent(new CustomEvent('subscriptionPricesUpdated'));
      
      // Log détaillé du cache pour debug
      console.log('📊 Cache Supabase détaillé:');
      Object.entries(newCache).forEach(([duration, prices]) => {
        console.log(`  ${duration} ans:`, Object.keys(prices).map(p => `${p}kWc=${prices[p]}€`).join(', '));
      });
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ Timeout Supabase (10s) - utilisation du fallback');
      } else {
        console.warn('⚠️ Erreur réseau Supabase - utilisation du fallback:', error.message);
      }
    } finally {
      isLoadingPrices = false;
    }
  })();
  
  await loadingPromise;
}

// Fonction pour initialiser les prix d'abonnement au démarrage
export function initializeSubscriptionPrices(): void {
  // Charger les prix en arrière-plan sans bloquer l'interface
  loadSubscriptionPricesFromSupabase().catch(error => {
    console.warn('⚠️ Impossible de charger les prix depuis Supabase au démarrage:', error);
  });
}

// Function to refresh subscription prices cache
export function refreshSubscriptionPricesCache(): Promise<void> {
  // Force reload by clearing cache
  subscriptionPricesCache = null;
  cacheTimestamp = 0;
  return loadSubscriptionPricesFromSupabase();
}

// Function to get cached subscription prices for debugging
export function getSubscriptionPricesCache(): {[key: string]: {[key: number]: number}} | null {
  return subscriptionPricesCache;
}

// Calculer le surcoût Enphase selon les nouvelles règles
export function calculateEnphaseCost(powerInKw: number): number {
  if (powerInKw <= 3) {
    return 1500;
  } else if (powerInKw <= 6) {
    return 1800;
  } else {
    return 2200;
  }
}

export function calculateFinalPrice(
  power: number,
  primeAutoconsommation: number,
  remiseCommerciale: number,
  microOnduleurs: boolean = false
): number {
  const basePrice = getPriceFromPower(power);
  if (basePrice === 0) {
    console.error(`Could not find price for power ${power} kWc`);
    return 0;
  }
  
  const enphaseAdditionalCost = microOnduleurs ? calculateEnphaseCost(power) : 0;
  
  return basePrice + enphaseAdditionalCost - primeAutoconsommation - remiseCommerciale;
}