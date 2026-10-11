"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Field, Card } from "@/components/ui";
import { signIn, signInWithGoogle } from "@/lib/auth/actions";

export default function LoginPage() {
  const [msg, setMsg] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await signIn(new FormData(e.currentTarget));
    if (res?.error) setMsg(res.error); // success redirects server-side
  }
  return (
    <div className="mx-auto flex min-h-[72vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-text-muted">Sign in to open the live board.</p>
      </div>
      <Card className="flex flex-col gap-4 p-6">
        <Button variant="secondary" type="button" onClick={() => signInWithGoogle()}>Continue with Google</Button>
        <div className="flex items-center gap-3 text-xs text-text-faint"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Field label="Email" name="id" type="email" required />
          <Field label="Password" name="password" type="password" required />
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
        {msg && <p role="alert" className="text-xs text-danger">{msg}</p>}
        <div className="text-center text-xs text-text-muted">
          New here? <Link href="/signup" className="text-accent-text hover:underline">Create an account</Link>
        </div>
      </Card>
    </div>
  );
}
