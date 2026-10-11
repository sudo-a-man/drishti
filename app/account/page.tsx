import Link from "next/link";
import { Button, Card } from "@/components/ui";
import FyersConnect from "@/components/FyersConnect";
import { currentUser } from "@/lib/auth/user";
import { signOut } from "@/lib/auth/actions";

export default async function AccountPage() {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
        <Card className="flex flex-col gap-3 p-6 text-center">
          <h1 className="font-display text-xl font-semibold">Your profile</h1>
          <p className="text-sm text-text-muted">Sign in to see your plan, billing and preferences.</p>
          <Link href="/login"><Button className="w-full">Sign in</Button></Link>
        </Card>
      </div>
    );
  }

  const name = (user.user_metadata?.name as string) || "";
  const initial = (name || user.email || "?").charAt(0).toUpperCase();
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight">Your profile</h1>
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-grad-accent font-display text-lg font-bold text-on-accent">{initial}</span>
          <div className="text-sm">
            {name && <div className="font-medium text-text">{name}</div>}
            <div className="text-text-muted">{user.email}</div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-4 text-sm">
          <span className="text-text-muted">Current plan</span>
          <span className="font-semibold text-text">Watch (free)</span>
        </div>
        <div className="flex gap-2">
          <Link href="/pricing" className="flex-1"><Button className="w-full">Upgrade</Button></Link>
          <form action={signOut} className="flex-1">
            <Button type="submit" variant="secondary" className="w-full">Sign out</Button>
          </form>
        </div>
      </Card>
      <FyersConnect />
    </div>
  );
}
