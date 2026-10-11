"use server";
import { redirect } from "next/navigation";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { signUpSchema, signInSchema } from "@/lib/validation";

type Result = { error?: string; ok?: boolean };
const DEMO = "Demo mode — add your Supabase keys to .env.local to enable real auth.";

export async function signUp(formData: FormData): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: DEMO };
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    mobile: formData.get("mobile"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name, mobile: parsed.data.mobile },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/app"); // email confirmation off -> auto signed in
  return { ok: true };
}

export async function signIn(formData: FormData): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: DEMO };
  const parsed = signInSchema.safeParse({ id: formData.get("id"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.id, password: parsed.data.password });
  if (error) return { error: error.message };
  redirect("/app");
}

export async function signInWithGoogle(): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: DEMO };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/app` },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(formData: FormData): Promise<Result> {
  if (!isSupabaseConfigured()) return { error: DEMO };
  const email = String(formData.get("id") ?? "");
  if (!email) return { error: "Enter your email." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/account`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
