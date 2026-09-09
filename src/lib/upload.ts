import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Upload safety net.
 *
 * Browser-side storage uploads go through GoTrue's _getAccessToken(), which
 * blocks on a token refresh. When the access token has expired and the refresh
 * cannot complete, that await never settles: no request is sent, no error is
 * raised, and the UI sits on "Uploading…" indefinitely. Nothing below fixes the
 * refresh itself — they make sure it can never present as a hang.
 */

/** Storage uploads are given this long before we call it a failure. */
export const UPLOAD_TIMEOUT_MS = 90_000;

/**
 * Ceiling for the whole auth pre-flight.
 *
 * Must clear boundedLock in supabase/browser.ts, which can spend 5s waiting on
 * a contended lock before proceeding, plus a token refresh round trip on top.
 * At 8s a slow-but-working refresh was reported as a failure.
 */
export const AUTH_TIMEOUT_MS = 20_000;

/**
 * Rejects if `promise` has not settled within `ms`.
 *
 * The underlying request may still be in flight — this bounds how long the
 * interface waits on it, which is the part the editor experiences.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        clearTimeout(timer);
        reject(cause);
      },
    );
  });
}

/**
 * Confirms there is a usable session before any bytes are sent, renewing one
 * that is about to lapse.
 *
 * Returns null when the caller may proceed, or a message to show the editor.
 * Checking first means an expired session costs a fast, clear error instead of
 * a long upload that cannot be authorised.
 */
export async function ensureFreshSession(
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_TIMEOUT_MS,
      "Could not read your sign-in state. Reload the page and try again.",
    );

    if (error) return `Sign-in check failed: ${error.message}`;

    const session = data.session;
    if (!session) {
      return "You are signed out. Sign in again, then retry the upload.";
    }

    // Renew anything inside a minute of lapsing: an upload started at the very
    // edge of validity is the case that hangs.
    const secondsLeft = (session.expires_at ?? 0) - Math.floor(Date.now() / 1000);
    if (secondsLeft > 60) return null;

    const refreshed = await withTimeout(
      supabase.auth.refreshSession(),
      AUTH_TIMEOUT_MS,
      "Your session expired and could not be renewed. Sign in again, then retry the upload.",
    );

    if (refreshed.error || !refreshed.data.session) {
      return "Your session expired. Sign in again, then retry the upload.";
    }

    return null;
  } catch (cause) {
    return cause instanceof Error
      ? cause.message
      : "Could not verify your session. Sign in again, then retry.";
  }
}

/** Turns anything thrown into a string worth showing someone. */
export function messageFor(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message) return cause.message;
  return fallback;
}
