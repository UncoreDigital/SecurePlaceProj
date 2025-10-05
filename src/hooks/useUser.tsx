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

// Cache user data across components to prevent multiple API calls
let cachedUser: UserSession | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useUser = () => {
  const supabase = useMemo(makeSupabase, []);
  const [user, setUser] = useState<UserSession | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser); // If cached, don't show loading
  const [error, setError] = useState<string | null>(null);

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
        setError(null);
        
        // Check cache first for faster loading
        const now = Date.now();
        if (cachedUser && (now - cacheTimestamp) < CACHE_DURATION) {
          console.log('⚡ useUser: Using cached data');
          setUser(cachedUser);
          setLoading(false);
          return;
        }
        
        if (!supabase) {
          const errorMsg = "Supabase URL/Anon key missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart dev server.";
          console.error(errorMsg);
          setError(errorMsg);
          setUser(null);
          return;
        }

        console.log('🔐 useUser: Fetching fresh auth data...');
        
        // Check if we have valid environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        console.log('🔑 Supabase config:', { 
          url: url ? `${url.substring(0, 20)}...` : 'MISSING',
          key: key ? `${key.substring(0, 20)}...` : 'MISSING'
        });

        // 1) Check authentication with better error handling
        const {
          data: { user: authUser },
          error: userErr,
        } = await supabase.auth.getUser();
        
        if (userErr) {
          console.error('🚨 Auth error:', userErr);
          if (userErr.message.includes('403') || userErr.message.includes('Forbidden')) {
            setError('Authentication failed. Please check your Supabase configuration or try logging in again.');
            // Try to clear any bad session
            await supabase.auth.signOut();
          }
          throw userErr;
        }

        console.log('👤 Auth user:', authUser ? `${authUser.email} (${authUser.id})` : 'No user');

        if (!authUser) {
          console.log('❌ No authenticated user found');
          setUser(null);
          return;
        }

        // 2) Load profile with better error handling
        console.log('📝 Fetching user profile...');
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("full_name, role, firm_id")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profileErr) {
          console.warn('⚠️ Profile fetch warning:', profileErr.message);
          if (profileErr.message.includes('403') || profileErr.message.includes('Forbidden')) {
            setError('Access denied. Please check your permissions or contact an administrator.');
          }
          // Still try to set user with auth info only
          if (!unsubscribed) setUser(buildSession(authUser, null));
          return;
        }

        console.log('✅ Profile loaded:', profile ? `${profile.role} - ${profile.full_name}` : 'No profile data');

        // Cache the user data for better performance
        const sessionData = buildSession(authUser, profile);
        cachedUser = sessionData;
        cacheTimestamp = Date.now();
        
        if (!unsubscribed) {
          setUser(sessionData);
        }
        
      } catch (err: any) {
        console.error('❌ useUser init error:', err);
        const errorMessage = err?.message || 'Unknown authentication error';
        if (!unsubscribed) {
          setError(errorMessage);
          setUser(null);
        }
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
      if (sub?.subscription) {
        sub.subscription.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]); // supabase instance is memoized

  return { user, loading, error };
};
