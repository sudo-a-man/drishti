"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Field, Card } from "@/components/ui";
import { signUp, signInWithGoogle } from "@/lib/auth/actions";

export default function SignupPage() {
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await signUp(new FormData(e.currentTarget));
    if (res?.error) { setMsg(res.error); setOk(false); }
    else if (res?.ok) { setOk(true); setMsg("Check your email to confirm your account."); }
  }
  return (
    <div className="mx-auto flex min-h-[72vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-text-muted">Free, and no card to start.</p>
      </div>
      <Card className="flex flex-col gap-4 p-6">
        <Button variant="secondary" type="button" onClick={() => signInWithGoogle()}>Continue with Google</Button>
        <div className="flex items-center gap-3 text-xs text-text-faint"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Field label="Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Mobile" name="mobile" hint="We'll verify this later." required />
          <Field label="Password" name="password" type="password" required />
          <Button type="submit" className="w-full">Create account</Button>
        </form>
        {msg && <p role="alert" className={`text-xs ${ok ? "text-success" : "text-danger"}`}>{msg}</p>}
        <div className="text-center text-xs text-text-muted">
          Already have an account? <Link href="/login" className="text-accent-text hover:underline">Sign in</Link>
        </div>
      </Card>
    </div>
  );
}
