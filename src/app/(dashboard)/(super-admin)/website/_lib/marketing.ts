import "server-only";
import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Shared helpers for the Website CMS screens.
 *
 * Every table here lives in the `marketing` schema rather than `public`, so
 * each query needs .schema("marketing"). Centralising that means a screen can
 * never quietly read the wrong schema.
 */

export const MEDIA_BUCKET = "marketing-media";
export const AUDIO_BUCKET = "marketing-audio";

export type ContentStatus = "draft" | "scheduled" | "published" | "archived";

export async function marketing() {
  const supabase = await createServerSupabase();
  return supabase.schema("marketing");
}

export function publicUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * The marketing tables carry a CHECK constraint requiring published_at whenever
 * status is 'published'. Deriving it here keeps every screen consistent and
 * stops an insert failing on a constraint the editor never sees.
 */
export function publishedAtFor(status: string, existing?: string | null): string | null {
  if (status !== "published") return null;
  return existing || new Date().toISOString();
}

/** Strips HTML so a rich-text body can be measured or previewed as plain text. */
export function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ~200 words per minute, floored at 1. Matches what the site displays. */
export function readingMinutes(html: string): number {
  const words = toPlainText(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/* ------------------------------------------------------------------ *
 * Readiness probe
 * ------------------------------------------------------------------ */

export type MarketingReadiness =
  | { ok: true }
  | {
      ok: false;
      reason: "no-credentials" | "schema-not-exposed" | "tables-missing" | "unknown";
      detail: string;
    };

/**
 * Is the marketing schema actually reachable?
 *
 * Every screen in this section reads marketing.*, so when the schema is not set
 * up they all fail at once. Probing once and rendering a single actionable
 * notice beats six broken tables and a console full of errors.
 *
 * Wrapped in React's cache() so the probe runs once per request no matter how
 * many components ask.
 */
export const marketingReadiness = cache(async (): Promise<MarketingReadiness> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      ok: false,
      reason: "no-credentials",
      detail: "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.",
    };
  }

  try {
    const db = await marketing();
    // A tiny real SELECT rather than a head-only count: HEAD responses carry no
    // body, so PostgREST's error payload is discarded and error.message comes
    // back as an empty string — which is exactly why these failures were
    // reporting as `failed: ""`.
    const { error } = await db.from("posts").select("id").limit(1);
    if (!error) return { ok: true };

    if (error.code === "PGRST106") {
      return {
        ok: false,
        reason: "schema-not-exposed",
        detail: error.message || "The marketing schema is not exposed to the API.",
      };
    }
    if (error.code === "PGRST205" || error.code === "42P01") {
      return {
        ok: false,
        reason: "tables-missing",
        detail: error.message || "The marketing tables do not exist yet.",
      };
    }
    return { ok: false, reason: "unknown", detail: describeError(error) };
  } catch (e) {
    return { ok: false, reason: "unknown", detail: (e as Error).message };
  }
});

/**
 * PostgREST errors carry code, details and hint; message alone is often empty
 * (any HEAD request) or unhelpful. Log all four or lose the diagnosis.
 */
export function describeError(error: {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}): string {
  return (
    [
      error.code && `[${error.code}]`,
      error.message || "(no message)",
      error.details && `details: ${error.details}`,
      error.hint && `hint: ${error.hint}`,
    ]
      .filter(Boolean)
      .join(" · ")
  );
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-700";
    case "scheduled":
      return "bg-amber-100 text-amber-700";
    case "archived":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

/**
 * What every website server action returns.
 *
 * These actions used to return void and only console.error their failures, so
 * a write rejected by RLS or a CHECK constraint was indistinguishable from a
 * success: the form closed, the list did not change, and the reason was visible
 * only in the server terminal.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Turns a Postgres failure into something an editor can act on.
 *
 * describeError() is right for the server log, but "[23514] new row for
 * relation ... violates check constraint albums_taken_on_not_future" tells the
 * person at the keyboard nothing about what to change. Unknown codes fall
 * through to the raw detail rather than being hidden behind a generic message.
 */
export function explainWriteError(
  error: { code?: string; message?: string },
  detail: string,
): string {
  switch (error.code) {
    case "23505":
      return "That slug is already used by another item. Try a different one.";
    case "23503":
      return "This record is still referenced by something else, so it cannot be removed yet.";
    case "23502":
      return "A required field was left empty.";
    case "42501":
      return "Your account is not permitted to change website content. It needs the super_admin role.";
    case "23514":
      if (error.message?.includes("taken_on_not_future")) {
        return "The date taken cannot be in the future. Pick today or earlier, or leave it blank.";
      }
      if (error.message?.includes("published_needs_date")) {
        return "Publishing needs a publish date.";
      }
      return detail;
    default:
      return detail;
  }
}
