export const metadata = { title: "Terms & Conditions · Drishti" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent-text">Legal</div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Terms &amp; Conditions</h1>
      <div className="mt-6 flex flex-col gap-4 leading-relaxed text-text-muted">
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Placeholder copy. Replace this with text from your own counsel before launch.</div>
        <p>This service is a market-analytics tool provided for educational purposes only. It is not investment advice and not a recommendation to buy or sell any security. You are responsible for your own trading decisions.</p>
        <p>You must be 18 or older to use this service. Access is personal and non-transferable. We may suspend accounts that abuse the service or breach these terms.</p>
        <p>The service is provided &quot;as is&quot;, without warranty. To the extent permitted by law, we are not liable for trading losses. These terms are governed by the laws of India.</p>
      </div>
    </div>
  );
}
