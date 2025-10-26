import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PhysicalBattery } from '../types/battery';
import { PHYSICAL_BATTERIES } from '../utils/constants/batteryOptions';

export function useBatteries() {
  const [batteries, setBatteries] = useState<PhysicalBattery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBatteries() {
      try {
        console.log('🔋 Fetching battery prices from Supabase...');
        
        const { data, error } = await supabase
          .from('battery_prices_purchase')
          .select('*')
          .order('capacity');

        if (error) {
          console.warn('⚠️ Supabase battery query failed:', error);
          console.log('🔄 Using fallback battery data from constants');
          
          // Fallback to predefined battery data
          setBatteries(PHYSICAL_BATTERIES);
          setError(null); // Clear error since we have fallback data
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.log('📦 No battery data in Supabase, using fallback');
          setBatteries(PHYSICAL_BATTERIES);
        } else {
          console.log(`✅ Loaded ${data.length} batteries from Supabase`);
          
          const formattedBatteries: PhysicalBattery[] = data.map(battery => ({
            id: battery.id,
            brand: 'CUSTOM',
            model: battery.model,
            capacity: battery.capacity,
            oneTimePrice: battery.price,
            autoconsumptionIncrease: battery.autoconsumption_increase || 15
          }));

          setBatteries(formattedBatteries);
        }
      } catch (err) {
        console.warn('🔄 Network error, using fallback battery data:', err);
        setBatteries(PHYSICAL_BATTERIES);
        setError(null); // Don't show error to user since we have fallback
      } finally {
        setLoading(false);
      }
    }

    fetchBatteries();
  }, []);

  return { batteries, loading, error };
}