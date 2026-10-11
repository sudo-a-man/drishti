"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Field, Card } from "@/components/ui";
import { requestPasswordReset } from "@/lib/auth/actions";

export default function ForgotPage() {
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await requestPasswordReset(new FormData(e.currentTarget));
    if (res?.error) { setMsg(res.error); setOk(false); }
    else { setOk(true); setMsg("If that account exists, a reset link is on its way."); }
  }
  return (
    <div className="mx-auto flex min-h-[72vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-1.5 text-sm text-text-muted">We&apos;ll email you a link to set a new one.</p>
      </div>
      <Card className="flex flex-col gap-4 p-6">
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Field label="Email" name="id" type="email" required />
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
        {msg && <p role="alert" className={`text-xs ${ok ? "text-success" : "text-danger"}`}>{msg}</p>}
        <div className="text-center text-xs text-text-muted">
          <Link href="/login" className="text-accent-text hover:underline">Back to sign in</Link>
        </div>
      </Card>
    </div>
  );
}
