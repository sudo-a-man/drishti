import GannCalc from "@/components/GannCalc";

export const metadata = { title: "Gann Square of 9 calculator — Drishti" };

export default function GannPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Levels</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Gann Square of 9</h1>
      <p className="mb-6 mt-1.5 max-w-2xl text-text-muted">
        Type any price or strike, or pull the live index spot, to get its Gann Square of 9 support and resistance levels. Each one maps to the nearest strike you can actually trade. Deterministic math, not a prediction, not advice.
      </p>
      <GannCalc />
    </div>
  );
}
