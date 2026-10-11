export const metadata = { title: "Refund Policy · Lumetra" };

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent-text">Legal</div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Refund Policy</h1>
      <div className="mt-6 flex flex-col gap-4 leading-relaxed text-text-muted">
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Placeholder copy. Set your own policy, and keep it legal in your market.</div>
        <p>Because this is a digital subscription with immediate access, we keep a short, clearly stated cooling-off window (7 days) during which an unused subscription can be refunded.</p>
        <p>Cancelling is one click from your account and stops the next renewal. Hard-to-cancel billing is a top user complaint, and in many places it&apos;s unlawful, so we don&apos;t do it.</p>
      </div>
    </div>
  );
}
