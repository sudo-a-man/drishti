import { fyersAccessToken } from "./fyers";

const BASE = "https://api-t1.fyers.in";

export const UNDERLYINGS: Record<string, { symbol: string; label: string }> = {
  nifty: { symbol: "NSE:NIFTY50-INDEX", label: "Nifty 50" },
  banknifty: { symbol: "NSE:NIFTYBANK-INDEX", label: "Bank Nifty" },
  sensex: { symbol: "BSE:SENSEX-INDEX", label: "Sensex" },
};

type Strike = { strike: number; ceOI: number; peOI: number; ceOICh: number; peOICh: number; ceLTP: number; peLTP: number; ceSym: string; peSym: string };

// Fetch an index option chain from Fyers and compute max pain + PCR.
// Max pain = the strike where option writers' total payout is smallest.
export async function optionAnalytics(key: string) {
  const u = UNDERLYINGS[key] ?? UNDERLYINGS.nifty;
  const token = await fyersAccessToken();
  if (!token) return null;

  const url = `${BASE}/data/options-chain-v3?symbol=${encodeURIComponent(u.symbol)}&strikecount=15`;
  const res = await fetch(url, { headers: { Authorization: `${process.env.FYERS_APP_ID}:${token}` } });
  const json = await res.json();
  if (json.s !== "ok" || !json.data) throw new Error(json.message || "Fyers option chain failed");

  const oc: any[] = json.data.optionsChain || json.data.optionChain || [];
  let spot = Number(json.data.ltp ?? json.data.indexLtp ?? 0) || 0;
  const byStrike = new Map<number, Strike>();
  for (const row of oc) {
    const type = row.option_type ?? row.type ?? "";
    const strike = Number(row.strike_price ?? row.strikePrice ?? row.strike);
    const oi = Number(row.oi ?? row.openInterest ?? 0);
    const oich = Number(row.oich ?? row.oiChange ?? 0); // change in OI since previous session close
    const ltp = Number(row.ltp ?? 0);
    const sym = String(row.symbol ?? row.ex_symbol ?? row.fyToken ?? "");
    if (!type) { spot = Number(row.ltp ?? row.fp ?? spot) || spot; continue; }
    if (!strike) continue;
    const s = byStrike.get(strike) ?? { strike, ceOI: 0, peOI: 0, ceOICh: 0, peOICh: 0, ceLTP: 0, peLTP: 0, ceSym: "", peSym: "" };
    if (type === "CE") { s.ceOI = oi; s.ceOICh = oich; s.ceLTP = ltp; s.ceSym = sym || s.ceSym; }
    else if (type === "PE") { s.peOI = oi; s.peOICh = oich; s.peLTP = ltp; s.peSym = sym || s.peSym; }
    byStrike.set(strike, s);
  }
  const strikes = [...byStrike.values()].sort((a, b) => a.strike - b.strike);

  let maxPain = 0;
  let minPain = Infinity;
  for (const cand of strikes) {
    let pain = 0;
    for (const s of strikes) {
      pain += s.ceOI * Math.max(cand.strike - s.strike, 0); // calls ITM when expiry > strike
      pain += s.peOI * Math.max(s.strike - cand.strike, 0); // puts ITM when expiry < strike
    }
    if (pain < minPain) { minPain = pain; maxPain = cand.strike; }
  }
  const totCe = strikes.reduce((a, s) => a + s.ceOI, 0);
  const totPe = strikes.reduce((a, s) => a + s.peOI, 0);
  const pcr = totCe > 0 ? Number((totPe / totCe).toFixed(2)) : 0;
  const expiry = json.data.expiryData?.[0]?.date ?? json.data.expiryData?.[0]?.expiry ?? "";

  // Highest call OI = resistance wall; highest put OI = support wall.
  const callWall = strikes.length ? strikes.reduce((m, s) => (s.ceOI > m.ceOI ? s : m)).strike : 0;
  const putWall = strikes.length ? strikes.reduce((m, s) => (s.peOI > m.peOI ? s : m)).strike : 0;
  // Where fresh OI is being written today = the wall that is *forming* (strongest OI build on each side).
  const ceAdds = strikes.filter((s) => s.ceOICh > 0);
  const peAdds = strikes.filter((s) => s.peOICh > 0);
  const callWallForming = ceAdds.length ? ceAdds.reduce((m, s) => (s.ceOICh > m.ceOICh ? s : m)).strike : 0;
  const putWallForming = peAdds.length ? peAdds.reduce((m, s) => (s.peOICh > m.peOICh ? s : m)).strike : 0;
  const vix = Number(json.data.indiavixData?.ltp ?? 0) || 0;

  return { underlying: key, label: u.label, spot, expiry, maxPain, pcr, callWall, putWall, callWallForming, putWallForming, vix, strikes };
}
