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

// localStorage configuration
const STORAGE_KEY = 'secure_place_user_session';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper functions for localStorage operations
const saveUserToStorage = (user: UserSession) => {
  if (typeof window !== 'undefined') {
    try {
      const userSession = {
        user,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
      console.log('💾 User saved to localStorage:', user.email, user.role);
    } catch (error) {
      console.warn('Failed to save user to localStorage:', error);
    }
  }
};

const loadUserFromStorage = (): UserSession | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { user, timestamp, expiresAt } = JSON.parse(stored);
        if (Date.now() < expiresAt) {
          console.log('📱 User loaded from localStorage:', user.email, user.role);
          return user;
        } else {
          localStorage.removeItem(STORAGE_KEY);
          console.log('⏰ Cached user expired, removed from localStorage');
        }
      }
    } catch (error) {
      console.warn('Failed to load user from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return null;
};

const clearUserFromStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ User cleared from localStorage');
  }
};

export const useUser = () => {
  const supabase = useMemo(makeSupabase, []);
  // Initialize user from localStorage if available
  const [user, setUser] = useState<UserSession | null>(() => loadUserFromStorage());
  const [loading, setLoading] = useState(true);
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
        
        // Check localStorage first for faster loading
        const cachedUser = loadUserFromStorage();
        if (cachedUser) {
          console.log('⚡ Using cached user from localStorage');
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

        console.log('🔐 useUser: Checking authentication...');
        
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
        
        // Build session and save to localStorage
        const sessionData = buildSession(authUser, profile);
        if (sessionData && !unsubscribed) {
          saveUserToStorage(sessionData); // Save to localStorage
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
    const { data: sub } = supabase?.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('👋 User signed out, clearing storage');
          clearUserFromStorage();
          setUser(null);
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('🔐 User signed in/refreshed, fetching profile');
          const { data: profile } = await supabase!
            .from("profiles")
            .select("full_name, role, firm_id")
            .eq("id", session.user.id)
            .maybeSingle();

          const sessionData = buildSession(session.user, profile ?? null);
          if (sessionData) {
            saveUserToStorage(sessionData);
            setUser(sessionData);
          }
        }
      } catch (e) {
        console.error("useUser listener error:", e);
        clearUserFromStorage();
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

  // Logout function that clears everything
  const logout = async () => {
    if (supabase) {
      try {
        console.log('🚐 Logging out user...');
        await supabase.auth.signOut();
        clearUserFromStorage();
        setUser(null);
        setError(null);
        console.log('✅ User logged out successfully');
      } catch (error) {
        console.error('❌ Logout error:', error);
        // Force clear even if signOut fails
        clearUserFromStorage();
        setUser(null);
      }
    }
  };

  return { user, loading, error, logout };
};

// Export helper functions for manual storage management
export { saveUserToStorage, loadUserFromStorage, clearUserFromStorage };
