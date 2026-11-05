import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: string };

interface AuthValue {
  user: User | null;
  loading: boolean;
  cloudEnabled: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const NOT_CONFIGURED: AuthResult = { ok: false, error: "Accounts aren't enabled" };

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
      // A failed session check falls back to guest mode rather than a stuck spinner.
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    user,
    loading,
    cloudEnabled: Boolean(supabase),
    login: async (email, password) => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    register: async (email, password, name) => {
      if (!supabase) return NOT_CONFIGURED;
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) return { ok: false, error: error.message };
      return { ok: true, needsConfirmation: !data.session };
    },
    loginWithGoogle: async () => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    sendPasswordReset: async (email) => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/new-password` });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    updatePassword: async (password) => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    logout: async () => {
      await supabase?.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
