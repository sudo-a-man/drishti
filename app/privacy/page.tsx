export const metadata = { title: "Privacy Policy · Drishti" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent-text">Legal</div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <div className="mt-6 flex flex-col gap-4 leading-relaxed text-text-muted">
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">Placeholder copy. Replace this with your own reviewed policy before launch.</div>
        <p>We collect the account details you give us (name, email, mobile) and basic usage data to run the service. We never ask for your broker login, and we do not sell personal data.</p>
        <p>We rely on a few processors to run the product: a database and auth provider, a payments provider, an email provider, and our host. Each one handles data only to provide its part of the service.</p>
        <p>You can request a copy of your data or its deletion at any time. Deleting your account removes your profile and the records tied to it.</p>
      </div>
    </div>
  );
}
