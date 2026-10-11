import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { currentUser } from "@/lib/auth/user";
import { signOut } from "@/lib/auth/actions";
import ThemeToggle from "@/components/ThemeToggle";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans-g", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display-g", display: "swap", weight: ["500", "600", "700"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-g", display: "swap" });

export const metadata: Metadata = {
  title: "Lumetra — F&O intelligence, decoded in real time",
  description: "An enterprise-grade market-analytics terminal for Indian F&O traders. Live option flow, max pain, support/resistance and Gann levels — analytics, not advice.",
};

const nav = [
  { href: "/pd", label: "Pullers & Draggers" },
  { href: "/meter", label: "Meter" },
  { href: "/app", label: "Genie" },
  { href: "/scanner", label: "Scanner" },
  { href: "/options", label: "Max Pain" },
  { href: "/gann", label: "Gann" },
  { href: "/charts", label: "Charts" },
  { href: "/lab", label: "Lab" },
  { href: "/pricing", label: "Pricing" },
];
const tabs = [
  { href: "/pd", label: "PD" },
  { href: "/meter", label: "Meter" },
  { href: "/app", label: "Genie" },
  { href: "/charts", label: "Charts" },
  { href: "/account", label: "Profile" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`,
          }}
        />
        <header className="glass sticky top-0 z-30 border-b border-border">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-grad-accent shadow-glow">
                <span className="h-2.5 w-2.5 rotate-45 rounded-[3px] bg-bg" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight">Lume<span className="text-gradient">tra</span></span>
            </Link>
            <nav className="ml-5 hidden items-center gap-5 lg:flex">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="text-sm text-text-muted transition-colors hover:text-text">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center gap-3">
                  <Link href="/account" className="hidden text-sm text-text-muted transition-colors hover:text-text sm:inline">{user.email}</Link>
                  <form action={signOut}>
                    <button type="submit" className="rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text">Sign out</button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className="hidden rounded-md px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text sm:inline">Sign in</Link>
                  <Link href="/signup" className="rounded-md bg-grad-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-glow transition hover:brightness-110">Start free</Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="pb-24 md:pb-0">{children}</main>

        <footer className="mt-24 border-t border-border bg-bg-elevated">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="flex flex-col gap-3">
              <span className="font-display text-lg font-bold tracking-tight">Lume<span className="text-gradient">tra</span></span>
              <p className="max-w-xs text-sm text-text-muted">The F&amp;O analytics terminal for Indian traders. Live option flow, structure and levels — in one calm screen.</p>
              <p className="text-xs text-text-faint">Analytics for education only. Not investment advice. Derivatives carry a high risk of loss.</p>
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-faint">Product</span>
              {nav.slice(0, 5).map((n) => <Link key={n.href} href={n.href} className="text-text-muted transition-colors hover:text-text">{n.label}</Link>)}
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-faint">Company</span>
              <Link href="/pricing" className="text-text-muted transition-colors hover:text-text">Pricing</Link>
              <Link href="/terms" className="text-text-muted transition-colors hover:text-text">Terms</Link>
              <Link href="/privacy" className="text-text-muted transition-colors hover:text-text">Privacy</Link>
              <Link href="/refund-policy" className="text-text-muted transition-colors hover:text-text">Refund policy</Link>
            </div>
          </div>
          <div className="border-t border-border py-5 text-center text-xs text-text-faint">© {new Date().getFullYear()} Lumetra. Market analytics for Indian F&amp;O traders.</div>
        </footer>

        <nav aria-label="Primary" className="glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border md:hidden">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className="flex h-16 flex-col items-center justify-center gap-0.5 text-xs text-text-muted transition-colors hover:text-text">
              {t.label}
            </Link>
          ))}
        </nav>
      </body>
    </html>
  );
}
