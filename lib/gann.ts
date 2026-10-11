// Gann Square of 9 — deterministic support/resistance level math.
// The Square of 9 is a spiral of numbers where one full 360° turn adds 2 to the
// square root of the price. A rotation of `deg` degrees therefore shifts the
// square root by deg/180, and squaring back gives the price level at that angle:
//   level(deg) = (√price ± deg/180)²
// Cardinal angles (90/180/270/360) are the "cross" levels Gann weighted most.
// These are technical reference levels, not trade signals.

export type GannLevel = { degrees: number; cardinal: boolean; resistance: number; support: number };

const ANGLES = [45, 90, 135, 180, 225, 270, 315, 360];

export function gannSquare9(price: number): GannLevel[] {
  if (!(price > 0)) return [];
  const root = Math.sqrt(price);
  return ANGLES.map((deg) => {
    const shift = deg / 180;
    const down = root - shift;
    return {
      degrees: deg,
      cardinal: deg % 90 === 0,
      resistance: Number(((root + shift) ** 2).toFixed(2)),
      support: down > 0 ? Number((down ** 2).toFixed(2)) : 0,
    };
  });
}

// Nearest tradable strike for an index whose strikes are `step` points apart.
export function nearestStrike(value: number, step: number): number {
  if (!(step > 0)) return Math.round(value);
  return Math.round(value / step) * step;
}
