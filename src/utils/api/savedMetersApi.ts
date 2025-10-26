import { supabase } from '../../lib/supabase';

export interface SavedMeter {
  id: string;
  prm: string;
  ask_id: string;
  contract_id: string;
  consent_id: string;
  label?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export interface SaveMeterInput {
  prm: string;
  ask_id: string;
  contract_id: string;
  consent_id: string;
  label?: string;
}

export const savedMetersApi = {
  async getAll(): Promise<SavedMeter[]> {
    const { data, error } = await supabase
      .from('saved_meters')
      .select('*')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved meters:', error);
      throw error;
    }

    return data || [];
  },

  async getByPrm(prm: string): Promise<SavedMeter | null> {
    const { data, error } = await supabase
      .from('saved_meters')
      .select('*')
      .eq('prm', prm)
      .maybeSingle();

    if (error) {
      console.error('Error fetching meter by PRM:', error);
      throw error;
    }

    return data;
  },

  async save(meter: SaveMeterInput): Promise<SavedMeter> {
    const existing = await this.getByPrm(meter.prm);

    if (existing) {
      const { data, error } = await supabase
        .from('saved_meters')
        .update({
          ask_id: meter.ask_id,
          contract_id: meter.contract_id,
          consent_id: meter.consent_id,
          label: meter.label,
          last_used_at: new Date().toISOString()
        })
        .eq('prm', meter.prm)
        .select()
        .single();

      if (error) {
        console.error('Error updating meter:', error);
        throw error;
      }

      return data;
    } else {
      const { data, error } = await supabase
        .from('saved_meters')
        .insert({
          ...meter,
          last_used_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving meter:', error);
        throw error;
      }

      return data;
    }
  },

  async updateLastUsed(prm: string): Promise<void> {
    const { error } = await supabase
      .from('saved_meters')
      .update({ last_used_at: new Date().toISOString() })
      .eq('prm', prm);

    if (error) {
      console.error('Error updating last used:', error);
      throw error;
    }
  },

  async updateLabel(prm: string, label: string): Promise<void> {
    const { error } = await supabase
      .from('saved_meters')
      .update({ label })
      .eq('prm', prm);

    if (error) {
      console.error('Error updating label:', error);
      throw error;
    }
  },

  async delete(prm: string): Promise<void> {
    const { error } = await supabase
      .from('saved_meters')
      .delete()
      .eq('prm', prm);

    if (error) {
      console.error('Error deleting meter:', error);
      throw error;
    }
  }
};
