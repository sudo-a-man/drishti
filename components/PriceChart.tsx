"use client";
import { useEffect, useRef } from "react";
import {
  createChart, ColorType, LineStyle, TickMarkType,
  type IChartApi, type ISeriesApi, type IPriceLine, type UTCTimestamp, type SeriesMarker, type Time, type LineData, type WhitespaceData,
} from "lightweight-charts";
import { ZonesPrimitive } from "./zonePrimitive";
import { liquidityZones, isHighVolume, type VolCandle } from "@/lib/zones";

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number };
export type SRLine = { price: number; color: string; title: string; dashed?: boolean };
export type Marker = { time: number; text: string; up: boolean; color?: string };
export type LevelLine = { color: string; dashed?: boolean; noScale?: boolean; width?: number; points: { time: number; value?: number }[] };

const fmtVol = (v?: number) => {
  if (!v) return "";
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
};

// Fyers timestamps are UTC epochs; render the axis and crosshair in IST (+5:30).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const istDate = (t: number) => new Date((t + 19800) * 1000);
const istTime = (t: number) => { const d = istDate(t); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };
const istDay = (t: number) => { const d = istDate(t); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

export default function PriceChart({ candles, lines = [], showBubbles = true, showZones = true, markers, levelLines, boxes, height = 440 }: {
  candles: Candle[]; lines?: SRLine[]; showBubbles?: boolean; showZones?: boolean; markers?: Marker[]; levelLines?: LevelLine[]; boxes?: { time: number; top: number; bottom: number; rgb: string }[]; height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const zonesRef = useRef<ZonesPrimitive | null>(null);
  const lineRefs = useRef<ISeriesApi<"Line">[]>([]);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#a1a1aa", fontFamily: "inherit" },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: true, secondsVisible: false, tickMarkFormatter: (t: Time, type: TickMarkType) => (type >= TickMarkType.Time ? istTime(Number(t)) : istDay(Number(t))) },
      localization: { timeFormatter: (t: Time) => `${istDay(Number(t))} ${istTime(Number(t))} IST` },
      crosshair: { mode: 0 },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444", borderUpColor: "#22c55e",
      borderDownColor: "#ef4444", wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    const zones = new ZonesPrimitive();
    series.attachPrimitive(zones);
    chartRef.current = chart; seriesRef.current = series; zonesRef.current = zones;
    const applyTheme = () => {
      const light = document.documentElement.classList.contains("light");
      chart.applyOptions({
        layout: { textColor: light ? "#566171" : "#a1a1aa" },
        grid: { vertLines: { color: light ? "rgba(16,24,40,0.06)" : "rgba(255,255,255,0.05)" }, horzLines: { color: light ? "rgba(16,24,40,0.06)" : "rgba(255,255,255,0.05)" } },
        rightPriceScale: { borderColor: light ? "rgba(16,24,40,0.12)" : "rgba(255,255,255,0.1)" },
        timeScale: { borderColor: light ? "rgba(16,24,40,0.12)" : "rgba(255,255,255,0.1)" },
      });
    };
    applyTheme();
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const onResize = () => chart.applyOptions({ width: ref.current?.clientWidth });
    onResize();
    window.addEventListener("resize", onResize);
    return () => { themeObserver.disconnect(); window.removeEventListener("resize", onResize); chart.remove(); chartRef.current = null; seriesRef.current = null; zonesRef.current = null; lineRefs.current = []; };
  }, [height]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    const vc = candles as VolCandle[];
    const m: SeriesMarker<Time>[] = [];
    if (showBubbles) for (let i = 0; i < vc.length; i++) if (isHighVolume(vc, i)) {
      const up = vc[i].close >= vc[i].open;
      m.push({ time: vc[i].time as UTCTimestamp, position: "aboveBar", color: up ? "#22c55e" : "#ef4444", shape: "circle", text: fmtVol(vc[i].volume) });
    }
    if (markers) for (const g of markers) m.push({ time: g.time as UTCTimestamp, position: g.up ? "belowBar" : "aboveBar", color: g.color ?? (g.up ? "#22c55e" : "#ef4444"), shape: g.up ? "arrowUp" : "arrowDown", text: g.text });
    m.sort((a, b) => (a.time as number) - (b.time as number));
    s.setMarkers(m);
    const liq = showZones ? liquidityZones(vc).map((z) => ({ time: z.time, top: z.top, bottom: z.bottom, rgb: z.bullish ? "34,197,94" : "239,68,68" })) : [];
    zonesRef.current?.setZones([...liq, ...(boxes ?? [])]);
    chartRef.current?.timeScale().fitContent();
  }, [candles, showBubbles, showZones, markers, boxes]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    const created: IPriceLine[] = lines.map((l) => s.createPriceLine({
      price: l.price, color: l.color, lineWidth: 1,
      lineStyle: l.dashed ? LineStyle.Dashed : LineStyle.Solid, axisLabelVisible: true, title: l.title,
    }));
    return () => created.forEach((pl) => s.removePriceLine(pl));
  }, [lines]);

  // Dynamic level line-series (e.g. the opening-range high/low and PT bands).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    lineRefs.current.forEach((ls) => chart.removeSeries(ls));
    lineRefs.current = [];
    for (const ll of levelLines ?? []) {
      // lightweight-charts throws ("data must be asc ordered by time") on duplicate
      // or out-of-order timestamps — which a session/opening-range band collapses to
      // when its window is a single candle. Sort, de-duplicate, and skip any series
      // that collapses to fewer than 2 points so one bad segment can't break the chart.
      const seen = new Set<number>();
      const pts = [...ll.points].sort((a, b) => a.time - b.time).filter((p) => (seen.has(p.time) ? false : (seen.add(p.time), true)));
      if (pts.length < 2) continue;
      const ser = chart.addLineSeries({ color: ll.color, lineWidth: (ll.width ?? 2) as 1 | 2 | 3 | 4, lineStyle: ll.dashed ? LineStyle.Dashed : LineStyle.Solid, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, ...(ll.noScale ? { autoscaleInfoProvider: () => null } : {}) });
      ser.setData(pts.map((p) => (p.value === undefined ? { time: p.time as UTCTimestamp } : { time: p.time as UTCTimestamp, value: p.value })) as (LineData | WhitespaceData)[]);
      lineRefs.current.push(ser);
    }
  }, [levelLines]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
