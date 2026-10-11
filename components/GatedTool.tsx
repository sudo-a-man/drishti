import Terminal from "./Terminal";
import { SignInGate } from "./ui";
import { currentUser } from "@/lib/auth/user";

// A tool page: open the live board when signed in, otherwise show the board
// shell behind the sign-in gate.
export default async function GatedTool({ tool, blurb }: { tool: string; blurb: string }) {
  const user = await currentUser();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Live board</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{tool}</h1>
      <p className="mb-6 mt-1.5 max-w-2xl text-text-muted">{blurb}</p>
      {user ? (
        <Terminal />
      ) : (
        <div className="relative">
          <Terminal />
          <SignInGate tool={tool} />
        </div>
      )}
    </div>
  );
}
