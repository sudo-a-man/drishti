import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// The signed-in user on the server (or null). Used by the layout, the gated
// tools and the account page to react to the real session.
export async function currentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
