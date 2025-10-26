import { useState } from 'react';
import { DateTime } from 'luxon';
import type { EnedisDataResponse } from '../types/enedisData';
import { supabase } from '../lib/supabase';

/* =========================
   Types + helpers exportés
   ========================= */
export type RawPoint = {
  date_time?: string;      // fin d'intervalle (Enedis)
  date?: string;
  time?: string;
  interval_length?: number;
  value: number | null;    // kW (courbe) ou kWh selon endpoint
  is_off_peak?: boolean;
};
export type NormPoint = { start: DateTime; end: DateTime; value: number | null };

const PARIS = 'Europe/Paris';
const dISO = (d: DateTime) => d.toFormat('yyyy-LL-dd');

/** Parse robuste fin d'intervalle Enedis → Luxon Europe/Paris */
export function parseEnedisEnd(ts: string): DateTime {
  const f = DateTime.fromFormat(ts, 'yyyy-LL-dd HH:mm:ss', { zone: PARIS });
  return f.isValid ? f : DateTime.fromISO(ts, { zone: PARIS });
}
/** Point normalisé (début d'intervalle) */
export function toParisStart(p: RawPoint): NormPoint {
  const end = parseEnedisEnd(p.date_time ?? p.date ?? '');
  const step = p.interval_length ?? 30;
  const start = end.minus({ minutes: step }).setZone(PARIS);
  return { start, end, value: p.value };
}
/** Normalise + coupe à J-1 inclus */
export function normalizeAndFilter(points: RawPoint[]): NormPoint[] {
  const cutoff = DateTime.now().setZone(PARIS).minus({ days: 1 }).endOf('day');
  const out: NormPoint[] = [];
  for (const p of points) {
    if (p.value == null) continue;
    const np = toParisStart(p);
    if (np.start <= cutoff) out.push(np);
  }
  return out;
}
/** Regroupe par DOW (1=Lundi … 7=Dimanche) via le début */
export function bucketByWeekdayStart(points: NormPoint[]): Record<number, NormPoint[]> {
  const b: Record<number, NormPoint[]> = { 1:[],2:[],3:[],4:[],5:[],6:[],7:[] };
  for (const p of points) b[p.start.weekday].push(p);
  return b;
}
/** "Qualité" par DOW */
export function completenessByDow(byDow: Record<number, NormPoint[]>) {
  const out: Record<number, { count: number; minHH: string; maxHH: string }> = {} as any;
  for (let d=1; d<=7; d++) {
    const arr = (byDow[d] ?? []).slice().sort((a,b)=>a.start.toMillis()-b.start.toMillis());
    out[d] = {
      count: arr.length,
      minHH: arr.length ? arr[0].start.toFormat('HH:mm') : '—',
      maxHH: arr.length ? arr[arr.length-1].start.toFormat('HH:mm') : '—',
    };
  }
  return out;
}

/* =========================================================
   Lecture optionnelle des VUES Supabase HP/HC (inchangé)
   ========================================================= */
const VIEWS = {
  daily:   'view_hp_hc_daily',
  totals:  'view_hp_hc_totals', 
  monthly: 'view_hp_hc_monthly',
} as const;

type HpHcTotals  = { total_kwh: number; hp_kwh: number; hc_kwh: number };
type HpHcMonthly = { month: string;  hp_kwh: number; hc_kwh: number; total_kwh: number };
type HpHcWeekly  = { week: string;   hp_kwh: number; hc_kwh: number; total_kwh: number };

// util tolérant
const pick = (row: any, keys: string[], def: any = 0) => {
  for (const k of keys) if (k in row && row[k] != null) return row[k];
  return def;
};

async function getHpHcTotalsFromView(prm: string, startISO?: string, endISO?: string): Promise<HpHcTotals | null> {
  try {
    if (startISO && endISO) {
      // Agrégation côté SQL sur la vue daily (utiliser 'date' pas 'day')
      const { data, error } = await supabase
        .from(VIEWS.daily)
        .select('kwh_hp.sum(),kwh_hc.sum(),kwh_total.sum()')
        .eq('prm', prm)
        .gte('date', startISO)
        .lte('date', endISO)
        .single();
      
      if (error || !data) return null;
      return {
        total_kwh: Number(data.sum ?? 0),
        hp_kwh: Number(data.sum ?? 0),
        hc_kwh: Number(data.sum ?? 0)
      };
    } else {
      // Lecture de la vue totals sans filtre
      const { data, error } = await supabase
        .from(VIEWS.totals)
        .select('kwh_hp,kwh_hc,kwh_total').eq('prm', prm).limit(1).maybeSingle();
      
      if (!error && data) {
        const hp = Number(data.kwh_hp ?? 0);
        const hc = Number(data.kwh_hc ?? 0);
        const total = Number(data.kwh_total ?? (hp + hc));
        return { total_kwh: total, hp_kwh: hp, hc_kwh: hc };
      }
      
      // Fallback: si la vue n'existe pas, retourne null silencieusement
      return null;
    }
  } catch { return null; }
}
async function getHpHcMonthlyFromView(prm: string, startISO: string, endISO: string): Promise<HpHcMonthly[]> {
  try {
    // Essaie d'abord la vue monthly
    let q = supabase.from(VIEWS.monthly).select('month,kwh_hp,kwh_hc,kwh_total').eq('prm', prm);
    q = q.gte('month', startISO).lte('month', endISO).order('month', { ascending: true });
    const { data, error } = await q;
    
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => {
        const month = (r.month as string).toString().slice(0, 7);
        const hp = Number(r.kwh_hp ?? 0);
        const hc = Number(r.kwh_hc ?? 0);
        const total = Number(r.kwh_total ?? (hp + hc));
        return { month, hp_kwh: hp, hc_kwh: hc, total_kwh: total };
      }).sort((a,b) => a.month.localeCompare(b.month));
    }
    
    // Fallback: si la vue n'existe pas, retourne un tableau vide
    return [];
  } catch { return []; }
}
async function getHpHcWeeklyFromView(prm: string, startISO: string, endISO: string): Promise<HpHcWeekly[]> {
  try {
    // Utilise la vue view_hp_hc_weekly qui calcule depuis load_curve_data
    let q = supabase.from('view_hp_hc_weekly').select('week,hc_kwh,hp_kwh,total_kwh').eq('prm', prm);
    q = q.gte('week', startISO).lte('week', endISO).order('week', { ascending: true });
    const { data, error } = await q;
    
    if (!error && Array.isArray(data)) {
      return data.map((r: any) => {
        const week = (r.week as string).toString();
        const hp = Number(r.hp_kwh ?? 0);
        const hc = Number(r.hc_kwh ?? 0);
        const total = Number(r.total_kwh ?? (hp + hc));
        return { week, hp_kwh: hp, hc_kwh: hc, total_kwh: total };
      }).sort((a,b) => a.week.localeCompare(b.week));
    }
    
    // Si erreur (vue manquante), retourne tableau vide silencieusement
    return [];
  } catch (err) {
    // Erreur réseau ou autre - retourne tableau vide silencieusement
    return [];
  }
}

/* =========================
   Hook principal
   ========================= */
export function useEnedisData() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<EnedisDataResponse | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  // Données UI inchangées
  const [displayConsumptionData, setDisplayConsumptionData] = useState<any[]>([]);
  const [displayLoadCurveData, setDisplayLoadCurveData] = useState<any[]>([]);
  const [displayMaxPowerData, setDisplayMaxPowerData] = useState<any[]>([]);

  // VUES HP/HC (optionnel)
  const [hpHcTotals,  setHpHcTotals]  = useState<HpHcTotals | null>(null);
  const [hpHcMonthly, setHpHcMonthly] = useState<HpHcMonthly[]>([]);
  const [hpHcWeekly,  setHpHcWeekly]  = useState<HpHcWeekly[]>([]);

  const setLoading = (k: string, v: boolean) => setLoadingStates(s => ({ ...s, [k]: v }));
  const isSectionLoading = (k: string) => !!loadingStates[k];

  /** borne J-1 (end inclus) sur 365 jours */
  const period365 = () => {
    const end = DateTime.now().setZone(PARIS).minus({ days: 1 }).endOf('day');
    const start = end.minus({ days: 364 }).startOf('day');
    return { start, end };
  };

  /* ---------- LECTURE tables clients (inchangé) ---------- */
  const fetchIdentityData = async (pdl: string) => {
    setLoading('identity', true);
    const { data, error } = await supabase.from('clients_identity').select('identity')
      .eq('usage_point_id', pdl).maybeSingle();
    setLoading('identity', false);
    if (error) throw error;
    return data?.identity ?? null;
  };
  const fetchAddressData = async (pdl: string) => {
    setLoading('address', true);
    const { data, error } = await supabase.from('clients_addresses').select('address')
      .eq('usage_point_id', pdl).maybeSingle();
    setLoading('address', false);
    if (error) throw error;
    return data?.address ?? null;
  };
  const fetchContractData = async (pdl: string) => {
    setLoading('contract', true);
    const { data, error } = await supabase.from('clients_contracts').select('contract')
      .eq('usage_point_id', pdl).maybeSingle();
    setLoading('contract', false);
    if (error) throw error;
    return data?.contract ?? null;
  };
  const fetchContactData = async (pdl: string) => {
    setLoading('contact', true);
    const { data, error } = await supabase.from('clients_contacts').select('contact_data')
      .eq('usage_point_id', pdl).maybeSingle();
    setLoading('contact', false);
    if (error) throw error;
    return data?.contact_data ?? null;
  };

  /* ---------- NOUVEAU : wrappers "refresh+read" pour re-remplir les tables ---------- */
  const upsertSafe = async (table: string, row: any) => {
    try {
      // essaie usage_point_id, sinon prm
      const onConflict = 'usage_point_id' in row ? 'usage_point_id' : ('prm' in row ? 'prm' : undefined);
      if (onConflict) {
        await supabase.from(table).upsert(row, { onConflict }).select().single();
      } else {
        await supabase.from(table).upsert(row);
      }
    } catch {
      /* silencieux : on ne bloque pas l'UX si l'upsert local échoue */
    }
  };

  const refreshIdentityThenRead = async (pdl: string) => {
    // 1) déclenche l'Edge qui remplit côté serveur
    try {
      const { data } = await supabase.functions.invoke('enedis-data', {
        method: 'POST',
        body: { action: 'get_identity', prm: pdl }
      });
      // 2) secours : si l'Edge ne persiste pas, on upsert localement
      if (data?.data) {
        await upsertSafe('clients_identity', { usage_point_id: pdl, identity: data.data });
      }
    } catch {/* ignore */}
    // 3) lecture standard
    return fetchIdentityData(pdl);
  };

  const refreshAddressThenRead = async (pdl: string) => {
    try {
      const { data } = await supabase.functions.invoke('enedis-data', {
        method: 'POST',
        body: { action: 'get_address', prm: pdl }
      });
      if (data?.data) {
        await upsertSafe('clients_addresses', { usage_point_id: pdl, address: data.data });
      }
    } catch {/* ignore */}
    return fetchAddressData(pdl);
  };

  const refreshContractsThenRead = async (pdl: string) => {
    try {
      const { data } = await supabase.functions.invoke('enedis-data', {
        method: 'POST',
        body: { action: 'get_contracts', prm: pdl }
      });
      if (data?.data) {
        await upsertSafe('clients_contracts', { usage_point_id: pdl, contract: data.data });
      }
    } catch {/* ignore */}
    return fetchContractData(pdl);
  };

  const refreshContactThenRead = async (pdl: string) => {
    try {
      const { data } = await supabase.functions.invoke('enedis-data', {
        method: 'POST',
        body: { action: 'get_contact', prm: pdl }
      });
      if (data?.data) {
        await upsertSafe('clients_contacts', { usage_point_id: pdl, contact_data: data.data });
      }
    } catch {/* ignore */}
    return fetchContactData(pdl);
  };

  /* ---------- Consommation quotidienne (365 j, J-1 inclus) ---------- */
  const getConsumptionData = async (prm: string) => {
    setLoading('consumption', true);
    const { start, end } = period365();
    const reqEnd = end.plus({ days: 1 });

    const { data, error } = await supabase.functions.invoke('enedis-data', {
      method: 'POST',
      body: { action: 'get_consumption', prm, startDate: dISO(start), endDate: dISO(reqEnd) }
    });
    setLoading('consumption', false);
    if (error) throw error;

    const rows: any[] = Array.isArray(data?.data) ? data!.data : [];
    const out = rows.filter(r => {
      const d = DateTime.fromISO(r.date, { zone: PARIS });
      return d >= start && d <= end;
    }).map(r => ({
      ...r,
      // CORRECTION: get_consumption retourne la consommation totale, pas séparée HP/HC
      // On met tout en peak_hours pour compatibilité, et off_peak_hours à 0
      peak_hours: r.peak_hours || r.value || 0,
      off_peak_hours: r.off_peak_hours || 0,
      total: r.total || r.peak_hours || r.value || 0
    }));
    setDisplayConsumptionData(out);
    return out;
  };

  /* ---------- Puissance max (365 j, J-1 inclus) ---------- */
  const getMaxPowerData = async (prm: string) => {
    setLoading('maxPower', true);
    const { start, end } = period365();
    const reqEnd = end.plus({ days: 1 });

    const { data, error } = await supabase.functions.invoke('enedis-data', {
      method: 'POST',
      body: { action: 'get_max_power', prm, startDate: dISO(start), endDate: dISO(reqEnd) }
    });
    setLoading('maxPower', false);
    if (error) throw error;

    const rows: any[] = Array.isArray(data?.data) ? data!.data : [];
    const out = rows.filter(r => {
      const d = parseEnedisEnd(r.date).setZone(PARIS);
      return d >= start && d <= end;
    }).map(r => ({
      ...r,
      max_power: r.max_power != null ? (r.max_power > 100 ? r.max_power / 1000 : r.max_power) : 0
    }));
    setDisplayMaxPowerData(out);
    return out;
  };

  /* ---------- Courbe annuelle (kW 30min → série **horaire** kW moyen) ---------- */
  const getAnnualLoadCurveData = async (prm: string) => {
    setLoading('annualLoadCurve', true);

    const { start, end } = period365();
    // Segments de 7 jours pour la progression (40 → 95%)
    const segments: Array<{ s: DateTime; e: DateTime }> = [];
    let cur = start;
    while (cur <= end) {
      const e = cur.plus({ days: 6 }) > end ? end : cur.plus({ days: 6 });
      segments.push({ s: cur, e });
      cur = e.plus({ days: 1 });
    }

    const all: RawPoint[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const pct = 40 + Math.round((i / segments.length) * 55);
      setProgress(pct);
      setStage(`Récupération courbe de charge (${i + 1}/${segments.length})`);

      const { data, error } = await supabase.functions.invoke('enedis-data', {
        method: 'POST',
        body: {
          action: 'get_load_curve',
          prm,
          startDate: dISO(seg.s),
          endDate: dISO(seg.e) // l'edge ajoute déjà +1 jour en interne (exclusive)
        }
      });
      if (!error && Array.isArray(data?.data)) {
        all.push(...(data!.data as RawPoint[]));
      }
      if (i < segments.length - 1) await new Promise(r => setTimeout(r, 200));
    }

    const { start: pStart, end: pEnd } = period365();
    const rawFiltered = all.filter(p => {
      const t = parseEnedisEnd(p.date_time ?? p.date ?? '');
      return t >= pStart && t <= pEnd.endOf('day');
    });

    type HourKey = string;
    const hourMap = new Map<HourKey, { date: string; time: string; date_time: string; sumKwh: number; offParts: number; totalParts: number }>();

    for (const p of rawFiltered) {
      if (p.value == null) continue;
      const np = toParisStart(p);
      const hourStart = np.start.startOf('hour');
      const key = hourStart.toISO({ suppressMilliseconds: true });
      const kwh30 = (p.value as number) * 0.5; // kW * 0.5h
      const rec = hourMap.get(key) ?? {
        date: hourStart.toFormat('yyyy-LL-dd'),
        time: hourStart.toFormat('HH:mm:ss'),
        date_time: hourStart.toUTC().toISO({ suppressMilliseconds: true })!,
        sumKwh: 0, offParts: 0, totalParts: 0,
      };
      rec.sumKwh += kwh30;
      rec.totalParts += 1;
      if (p.is_off_peak) rec.offParts += 1;
      hourMap.set(key, rec);
    }

    const hourly = Array.from(hourMap.values())
      .sort((a, b) => a.date_time.localeCompare(b.date_time))
      .map(r => ({
        prm,
        date: r.date,
        time: r.time,
        date_time: r.date_time,
        value: r.sumKwh,
        is_off_peak: r.offParts === r.totalParts
      }));

    setDisplayLoadCurveData(hourly);
    setLoading('annualLoadCurve', false);
    return hourly;
  };

  /* ---------- Orchestrateur (progression inchangée) ---------- */
  const fetchAllData = async (prm: string) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    setSuccess(null);
    setData(null);
    setDataSource(null);
    setStage('Initialisation');

    if (!/^\d{14}$/.test(prm)) {
      setError('PDL invalide. Le PDL doit comporter 14 chiffres.');
      setIsLoading(false);
      return;
    }

    try {
      // ⚠️ NE PAS modifier les paliers de progression / libellés
      setStage('Identité client');          setProgress(2);
      const identity = await refreshIdentityThenRead(prm).catch(() => null);

      setStage('Adresse client');           setProgress(4);
      const address = await refreshAddressThenRead(prm).catch(() => null);

      setStage('Contrats client');          setProgress(6);
      const contract = await refreshContractsThenRead(prm).catch(() => null);

      setStage('Contacts client');          setProgress(8);
      const contact = await refreshContactThenRead(prm).catch(() => null);

      setStage('Début des données de consommation'); setProgress(10);
      const consumption = await getConsumptionData(prm).catch(() => []);

      setStage('Données de puissance max'); setProgress(30);
      const maxPower = await getMaxPowerData(prm).catch(() => []);

      setStage('Début courbe de charge');   setProgress(40);
      const loadCurve = await getAnnualLoadCurveData(prm).catch(() => []);

      // VUES HP/HC (lecture "best-effort")
      try {
        const { start, end } = period365();
        const startISO = dISO(start);
        const endISO   = dISO(end);
        const [tot, mon, wk] = await Promise.all([
          getHpHcTotalsFromView(prm),
          getHpHcMonthlyFromView(prm, startISO, endISO),
          getHpHcWeeklyFromView(prm, startISO, endISO),
        ]);
        if (tot) setHpHcTotals(tot);
        if (mon.length) setHpHcMonthly(mon);
        if (wk.length)  setHpHcWeekly(wk);
      } catch (err) {
        // Ignore silencieusement les erreurs des vues HP/HC
        // Ces vues sont optionnelles et peuvent ne pas exister
      }

      setProgress(100);
      setStage('Finalisation');

      const result: EnedisDataResponse = {
        clientProfile: { usage_point_id: prm, identity, address, contract, contact },
        consumptionData: { consumption },
        loadCurveData: { loadCurve }
      };
      setData(result);
      setDataSource('Supabase + Enedis');
      setSuccess('Données récupérées avec succès');
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la récupération des données');
    } finally {
      setIsLoading(false);
      setStage('');
    }
  };

  const retryFetchAllData = (prm: string) => { setError(null); fetchAllData(prm); };

  return {
    // état
    data, isLoading, loadingStates, isSectionLoading,
    error, success, setError, setSuccess,
    dataSource, progress, stage,

    // actions
    fetchAllData, retryFetchAllData,

    // données pour l'UI (inchangées)
    displayConsumptionData,
    displayLoadCurveData,   // **horaire**
    displayMaxPowerData,

    // vues HP/HC (optionnel)
    hpHcTotals,
    hpHcMonthly,
    hpHcWeekly,

    // utilitaires exportés
    normalizeAndFilter, bucketByWeekdayStart, completenessByDow,
  };
}