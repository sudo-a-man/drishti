import type {
  ISeriesPrimitive, ISeriesPrimitivePaneView, ISeriesPrimitivePaneRenderer,
  SeriesAttachedParameter, Time, IChartApi, ISeriesApi,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

export type Zone = { time: number; top: number; bottom: number; rgb: string };

// A lightweight-charts primitive that paints liquidity-zone rectangles behind
// the candles, each extended to the right edge of the chart.
class ZonesRenderer implements ISeriesPrimitivePaneRenderer {
  constructor(private _p: ZonesPrimitive) {}
  draw(target: CanvasRenderingTarget2D) {
    const { chart, series, zones } = this._p;
    if (!chart || !series || zones.length === 0) return;
    const ts = chart.timeScale();
    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const rightX = scope.mediaSize.width;
      for (const z of zones) {
        const x1 = ts.timeToCoordinate(z.time as Time);
        const yTop = series.priceToCoordinate(z.top);
        const yBot = series.priceToCoordinate(z.bottom);
        if (x1 === null || yTop === null || yBot === null) continue;
        const rgb = z.rgb;
        const x = Math.max(0, x1);
        ctx.fillStyle = `rgba(${rgb},0.12)`;
        ctx.fillRect(x, yTop, rightX - x, yBot - yTop);
        ctx.strokeStyle = `rgba(${rgb},0.5)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, yTop, rightX - x, yBot - yTop);
      }
    });
  }
}

class ZonesPaneView implements ISeriesPrimitivePaneView {
  constructor(private _p: ZonesPrimitive) {}
  zOrder() { return "bottom" as const; }
  renderer(): ISeriesPrimitivePaneRenderer { return new ZonesRenderer(this._p); }
}

export class ZonesPrimitive implements ISeriesPrimitive<Time> {
  chart: IChartApi | null = null;
  series: ISeriesApi<"Candlestick"> | null = null;
  zones: Zone[] = [];
  private _views: ISeriesPrimitivePaneView[] = [new ZonesPaneView(this)];
  private _requestUpdate: (() => void) | null = null;

  attached(param: SeriesAttachedParameter<Time>) {
    this.chart = param.chart;
    this.series = param.series as ISeriesApi<"Candlestick">;
    this._requestUpdate = param.requestUpdate;
  }
  detached() { this.chart = null; this.series = null; this._requestUpdate = null; }
  setZones(z: Zone[]) { this.zones = z; this._requestUpdate?.(); }
  updateAllViews() {}
  paneViews() { return this._views; }
}
