type R65Point = { d?: string; date?: string; v?: number; value?: number };
type R65Grandeur = {
  grandeurMetier?: string;
  grandeurPhysique?: string;
  unite?: string;
  points?: R65Point[];
};

export interface R65DailyRow {
  date: string;
  energy_total_kwh: number;
}

export function mapR65ToDailyRows(raw: any): R65DailyRow[] {
  const arr: R65Grandeur[] = Array.isArray(raw?.grandeur) ? raw.grandeur : [];
  const g = arr.find(x =>
    ["CONS","CONSO","CONSUMPTION"].includes((x?.grandeurMetier || "").toUpperCase()) &&
    ["EA","E"].includes((x?.grandeurPhysique || "").toUpperCase())
  );
  if (!g || !Array.isArray(g.points)) return [];
  const factor = String(g.unite || "").toLowerCase() === "wh" ? 1/1000 : 1;
  const rows = g.points.map(p => {
    const date = p.d || p.date || "";
    const val = Number(p.v ?? p.value ?? 0) * factor;
    return { date, energy_total_kwh: Math.round(val * 1000) / 1000 };
  }).filter(r => r.date);
  rows.sort((a,b) => a.date.localeCompare(b.date));
  return rows;
}
