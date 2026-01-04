"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  try {
    return createBrowserSupabase();
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
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
    console.log('🧹 Starting comprehensive storage cleanup...');
    
    // Clear the main user session
    localStorage.removeItem(STORAGE_KEY);
    
    // Clear all Supabase-related storage
    const keysToRemove = [
      'supabase.auth.token',
      'sb-localhost-auth-token', // Local development
      'sb-auth-token',
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear any storage keys that contain auth-related terms
    [...Object.keys(localStorage), ...Object.keys(sessionStorage)].forEach(key => {
      if (key.startsWith('sb-') || // Supabase prefix
          key.includes('supabase') ||
          key.includes('auth') ||
          key.includes('session') ||
          key.includes('user') ||
          key.includes('secure_place')) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        console.log('🗑️ Removed storage key:', key);
      }
    });
    
    console.log('✅ Storage cleanup completed');
  }
};

const loadUserDetailLocalStorage = (): any | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { user, timestamp, expiresAt } = JSON.parse(stored);
        if (Date.now() < expiresAt) {
          return JSON.parse(stored);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load user from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return null;
};

export const useUser = () => {
  const supabase = useMemo(makeSupabase, []);
  const queryClient = useQueryClient();
  
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
  
  // React Query hook for user data with caching
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      // Check localStorage first for faster loading
      const cachedUser = loadUserFromStorage();
      if (cachedUser) {
        console.log('⚡ Using cached user from localStorage');
        return cachedUser;
      }
      
      if (!supabase) {
        const errorMsg = "Supabase URL/Anon key missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart dev server.";
        console.error(errorMsg);
        throw new Error(errorMsg);
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
          // Try to clear any bad session
          await supabase.auth.signOut();
        }
        throw userErr;
      }

      console.log('👤 Auth user:', authUser ? `${authUser.email} (${authUser.id})` : 'No user');

      if (!authUser) {
        console.log('❌ No authenticated user found');
        return null;
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
        // Still try to set user with auth info only
        return buildSession(authUser, null);
      }

      console.log('✅ Profile loaded:', profile ? `${profile.role} - ${profile.full_name}` : 'No profile data');
      
      // Build session and save to localStorage
      const sessionData = buildSession(authUser, profile);
      if (sessionData) {
        saveUserToStorage(sessionData); // Save to localStorage
      }
      
      return sessionData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Retry failed queries once
  });

  // Subscribe to auth state changes so the hook stays in sync
  useEffect(() => {
    if (!supabase) return;
    
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email);
      
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('👋 User signed out, clearing storage');
          clearUserFromStorage();
          queryClient.setQueryData(['user'], null);
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
            queryClient.setQueryData(['user'], sessionData);
          }
        }
      } catch (e) {
        console.error("useUser listener error:", e);
        clearUserFromStorage();
        queryClient.setQueryData(['user'], null);
      }
    });

    return () => {
      if (sub?.subscription) {
        sub.subscription.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, queryClient]);

  // Logout function that clears everything
  const logout = async () => {
    try {
      console.log('🚐 Starting comprehensive logout process...');
      
      // Step 1: Clear local storage first (before API calls)
      clearUserFromStorage();
      
      // Step 2: Clear React Query cache
      queryClient.setQueryData(['user'], null);
      queryClient.clear(); // Clear all cached data
      
      // Step 3: Call server-side logout to clear cookies
      try {
        console.log('🌐 Calling server-side logout...');
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          console.log('✅ Server-side logout successful');
        } else {
          console.warn('⚠️ Server-side logout failed, continuing...');
        }
      } catch (serverError) {
        console.warn('⚠️ Server-side logout error (continuing anyway):', serverError);
      }
      
      // Step 4: Sign out from Supabase client (if client exists)
      if (supabase) {
        console.log('🔐 Signing out from Supabase client...');
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
          console.warn('⚠️ Supabase client signOut error (continuing anyway):', error);
        } else {
          console.log('✅ Supabase client signOut successful');
        }
      }
      
      // Step 5: Clear all possible auth-related storage
      if (typeof window !== 'undefined') {
        // Clear localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || // Supabase keys
              key.includes('supabase') ||
              key.includes('auth') ||
              key.includes('session') ||
              key.includes('user') ||
              key.includes('token')) {
            localStorage.removeItem(key);
            console.log('🗑️ Cleared localStorage key:', key);
          }
        });
        
        // Clear sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-') ||
              key.includes('supabase') ||
              key.includes('auth') ||
              key.includes('session') ||
              key.includes('user') ||
              key.includes('token')) {
            sessionStorage.removeItem(key);
            console.log('🗑️ Cleared sessionStorage key:', key);
          }
        });
      }
      
      // Step 6: Force a hard redirect to clear any remaining state
      console.log('🔄 Redirecting to login page...');
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Force clear everything even if there are errors
      clearUserFromStorage();
      queryClient.clear();
      
      // Force redirect even on error
      window.location.href = '/';
      
      console.log('⚠️ Forced logout completed despite errors');
    }
  };

  return { user: data, loading: isLoading, error: error ? error.message : null, logout, refetch };
};

// Export helper functions for manual storage management
export { saveUserToStorage, loadUserFromStorage, clearUserFromStorage, loadUserDetailLocalStorage };
