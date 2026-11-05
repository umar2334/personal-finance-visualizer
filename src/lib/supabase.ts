import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when not configured; the app then runs in guest mode only. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export const googleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";
