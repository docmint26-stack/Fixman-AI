import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api/client";

let client: SupabaseClient | null | undefined;
let unauthUser: User | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    client = null;
    return null;
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getSessionUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  unauthUser = user ?? null;
  return user ?? null;
}

export async function signInWithPassword(email: string, password: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: humanizeAuthError(error.message) };
  }
  return { error: null };
}

export async function signUpNewUser(email: string, password: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." };
  }
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: humanizeAuthError(error.message) };
  }
  return { error: null };
}

export async function signOutSession(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    unauthUser = null;
  }
  unauthUser = null;
}

export function cachedUnauthUser(): User | null {
  return unauthUser ?? null;
}

function humanizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Check your inbox — your email still needs to be confirmed.";
  }
  if (lower.includes("user already registered")) {
    return "An account already exists for this email. Try signing in instead.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  return message;
}

export function supabaseAuthError(): ApiError {
  return new ApiError(503, "AUTH_NOT_CONFIGURED", "Supabase auth is not configured.");
}