"use client";

import { createBrowserClient } from "@supabase/ssr";

// Create a single browser client instance at module load time
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/** How long to wait for the auth lock before giving up on it. */
const LOCK_ACQUIRE_TIMEOUT_MS = 5000;

/**
 * A lock that can be contended but never deadlocks.
 *
 * GoTrue serialises token work behind navigator.locks, and asks for that lock
 * with no timeout. navigator.locks is scoped to the *origin*, not the tab, so a
 * client stuck mid-refresh in any other localhost tab holds it and every later
 * getSession() waits forever — no request, no error, just a promise that never
 * settles. That is what left uploads sitting on "Uploading…".
 *
 * This keeps mutual exclusion in the normal case and, when the lock cannot be
 * had within a few seconds, runs the operation anyway. The worst case is two
 * overlapping token refreshes, which GoTrue tolerates; a permanent hang it does
 * not.
 */
async function boundedLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    return fn();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOCK_ACQUIRE_TIMEOUT_MS);

  try {
    return await navigator.locks.request(
      name,
      { mode: "exclusive", signal: controller.signal },
      async () => fn(),
    );
  } catch (cause) {
    // Aborting rejects the request without ever running the callback, so the
    // operation still has to happen — just without the lock.
    if (controller.signal.aborted) {
      console.warn(
        `[supabase] auth lock "${name}" held for over ${LOCK_ACQUIRE_TIMEOUT_MS}ms; continuing without it`,
      );
      return fn();
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

// Single instance created once and reused - prevents multiple GoTrueClient warnings
const browserClient = createBrowserClient(url, key, {
  auth: {
    // NOTE: @supabase/ssr overwrites persistSession, autoRefreshToken,
    // detectSessionInUrl, flowType and storage *after* spreading these, so
    // those are fixed by the library (flowType is always "pkce") and setting
    // them here does nothing. `lock` is not overwritten, which is why it can
    // be supplied.
    lock: boundedLock,
  },
  global: {
    headers: {
      'X-Client-Info': 'secure-place-web'
    }
  }
});

console.log('✅ Supabase browser client initialized once');

// Export function that always returns the same instance
export function createBrowserSupabase() {
  return browserClient;
}

// Uploads a file to Supabase Storage and returns the public URL
export async function uploadImageToSupabase(file: File, folder = "thumbnails") {
  const supabase = createBrowserSupabase();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;
  const { data, error } = await supabase.storage.from(folder).upload(fileName, file);
  if (error) throw error;
  // Get public URL
  const { data: urlData } = supabase.storage.from(folder).getPublicUrl(fileName);
  return urlData?.publicUrl || "";
}
