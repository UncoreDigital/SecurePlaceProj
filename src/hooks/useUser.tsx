"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

// Combine Auth user and Profile document into one type (keeps your shape)
export interface UserSession {
  // subset of Supabase User (add more fields if you need)
  id: string;
  email?: string;
  // your profile projections
  fullName?: string;
  role?: string; // 'super_admin' | 'firm_admin' | 'employee'
  firmId?: string | null;
}

// Small helper to avoid crashing if env is missing
function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Return null so the hook can show a clear error
    return null;
  }
  return createBrowserClient(url, anon);
}

export const useUser = () => {
  const supabase = useMemo(makeSupabase, []);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Turn a Supabase user + profile row into your UserSession shape
  const buildSession = (
    u: User | null,
    profile?: {
      full_name?: string;
      role?: string;
      firm_id?: string | null;
    } | null
  ): UserSession | null => {
    if (!u) return null;
    return {
      id: u.id,
      email: u.email ?? undefined,
      fullName: profile?.full_name ?? undefined,
      role: profile?.role ?? undefined,
      firmId: profile?.firm_id ?? null,
    };
  };

  useEffect(() => {
    let unsubscribed = false;
    const init = async () => {
      try {
        if (!supabase) {
          console.error(
            "Supabase URL/Anon key missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart dev server."
          );
          setUser(null);
          return;
        }

        // 1) Who is logged in?
        const {
          data: { user: authUser },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        if (!authUser) {
          setUser(null);
          return;
        }

        // 2) Load profile (RLS allows user to read their own profile)
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("full_name, role, firm_id")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profileErr) {
          // If the row isn't there yet, just return auth info
          console.warn("Profile fetch warning:", profileErr.message);
          setUser(buildSession(authUser, null));
          return;
        }

        if (!unsubscribed) setUser(buildSession(authUser, profile));
      } catch (err) {
        console.error("useUser init error:", err);
        if (!unsubscribed) setUser(null);
      } finally {
        if (!unsubscribed) setLoading(false);
      }
    };

    init();

    // 3) Subscribe to auth state changes so the hook stays in sync
    const { data: sub } = supabase?.auth.onAuthStateChange(async (event) => {
      // Re-run the same fetch on sign-in/out/token refresh
      try {
        const {
          data: { user: authUser },
        } = await supabase!.auth.getUser();
        if (!authUser) {
          setUser(null);
          return;
        }
        const { data: profile } = await supabase!
          .from("profiles")
          .select("full_name, role, firm_id")
          .eq("id", authUser.id)
          .maybeSingle();

        setUser(buildSession(authUser, profile ?? null));
      } catch (e) {
        console.error("useUser listener error:", e);
        setUser(null);
      }
    }) ?? { unsubscribe: () => {} };

    return () => {
      unsubscribed = true;
      sub.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]); // supabase instance is memoized

  return { user, loading };
};
