// Synthetic data layer for Lumetra, used as a fallback when no live feed is
// connected. Deterministic per (symbol, minute) so the board looks live and
// "moves" each minute without a server. NOTE: synthetic numbers, not real
// market data.

export type Side = "bull" | "bear";
export type Signal = "buy" | "sell" | "hold";

export interface Instrument {
  symbol: string;
  name: string;
  sector: string;
  base: number;
}
export interface BoardRow extends Instrument {
  ltp: number;
  changePct: number;
  rating: number; // -100..+100
  signal: Signal;
  bull: number;
  bear: number;
  goldenZone: boolean;
  rank: number;
  prevRank: number;
}
export interface SectorRow {
  sector: string;
  avgStrength: number;
  leading: boolean;
}

export const INSTRUMENTS: Instrument[] = [
  { symbol: "SBIN", name: "State Bank of India", sector: "PSU Bank", base: 842 },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Private Bank", base: 1180 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Private Bank", base: 1685 },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer", base: 3360 },
  { symbol: "INFY", name: "Infosys", sector: "IT", base: 1870 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", base: 548 },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT", base: 1795 },
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", base: 2890 },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", base: 985 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", base: 12850 },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma", base: 1720 },
  { symbol: "CIPLA", name: "Cipla", sector: "Pharma", base: 1540 },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Infra", base: 2410 },
  { symbol: "ITC", name: "ITC", sector: "FMCG", base: 465 },
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metal", base: 152 },
  { symbol: "ONGC", name: "ONGC", sector: "Energy", base: 268 },
];

// deterministic 0..1 from (symbol, salt)
function seeded(sym: string, salt: number): number {
  let h = 2166136261;
  const s = `${sym}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

export function minuteBucket(d: Date = new Date()): number {
  return Math.floor(d.getTime() / 60000);
}

function row(i: Instrument, bucket: number): BoardRow {
  const r = seeded(i.symbol, bucket);
  const rating = Math.round((r * 2 - 1) * 100);
  const changePct = +(((r * 2 - 1) * 3)).toFixed(2);
  const ltp = +(i.base * (1 + changePct / 100)).toFixed(2);
  const signal: Signal = rating > 25 ? "buy" : rating < -25 ? "sell" : "hold";
  return {
    ...i,
    ltp,
    changePct,
    rating,
    signal,
    bull: Math.max(0, rating),
    bear: Math.max(0, -rating),
    goldenZone: Math.abs(rating) > 70,
    rank: 0,
    prevRank: 0,
  };
}

export function getBoard(side: Side, bucket: number = minuteBucket()): BoardRow[] {
  const rows = INSTRUMENTS.map((i) => row(i, bucket))
    .filter((x) => (side === "bull" ? x.rating > 0 : x.rating < 0))
    .sort((a, b) => (side === "bull" ? b.rating - a.rating : a.rating - b.rating));
  rows.forEach((x, idx) => {
    x.rank = idx + 1;
    x.prevRank = idx + 1 + (seeded(x.symbol, bucket - 1) > 0.5 ? 1 : -1);
  });
  return rows.slice(0, 20);
}

export function getStock(symbol: string, bucket: number = minuteBucket()): BoardRow | undefined {
  const i = INSTRUMENTS.find((x) => x.symbol === symbol);
  return i ? row(i, bucket) : undefined;
}

export function getSectors(bucket: number = minuteBucket()): SectorRow[] {
  const map = new Map<string, number[]>();
  INSTRUMENTS.forEach((i) => {
    const arr = map.get(i.sector) ?? [];
    arr.push(row(i, bucket).rating);
    map.set(i.sector, arr);
  });
  const out = [...map.entries()].map(([sector, ratings]) => ({
    sector,
    avgStrength: Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length),
    leading: false,
  }));
  out.sort((a, b) => b.avgStrength - a.avgStrength);
  if (out.length) out[0].leading = true;
  return out;
}

export function getBreadth(bucket: number = minuteBucket()): { bull: number; bear: number } {
  const all = INSTRUMENTS.map((i) => row(i, bucket));
  return { bull: all.filter((x) => x.rating > 0).length, bear: all.filter((x) => x.rating < 0).length };
}
