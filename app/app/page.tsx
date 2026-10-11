import Terminal from "@/components/Terminal";

export default function AppPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Genie · live board</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">The board</h1>
      <p className="mb-6 mt-1.5 max-w-2xl text-text-muted">
        The strongest F&amp;O stocks right now, ranked by the meter. Refreshes every minute, live when your Fyers is connected.
      </p>
      <Terminal />
    </div>
  );
}
