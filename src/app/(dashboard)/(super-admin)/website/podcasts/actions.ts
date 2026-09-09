"use server";

import { revalidatePath } from "next/cache";
import { marketing, describeError, publishedAtFor, slugify } from "../_lib/marketing";
import { explainWriteError } from "../_lib/marketing";
import type { ActionResult } from "../_lib/marketing";

/**
 * Server actions for this screen.
 *
 * Kept out of page.tsx: Next.js only permits a fixed set of exports from a
 * page module, and anything else fails the generated route type check.
 */

const REVALIDATE_PATH = "/website/podcasts";

export async function saveEpisode(formData: FormData): Promise<ActionResult> {
  const db = await marketing();

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  const audio = String(formData.get("audioPath") || "").trim() || null;
  const spotify = String(formData.get("spotifyUrl") || "").trim() || null;
  const apple = String(formData.get("appleUrl") || "").trim() || null;
  const youtube = String(formData.get("youtubeUrl") || "").trim() || null;

  let status = String(formData.get("status") || "draft");

  // Mirrors episodes_published_needs_audio. Falling back to draft is kinder
  // than surfacing a constraint violation the author cannot interpret.
  if (status === "published" && !audio && !spotify && !apple && !youtube) {
    console.warn("Episode has nothing to play — saving as draft instead.");
    status = "draft";
  }

  const guests = String(formData.get("guests") || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const episodeNumber = Number(formData.get("episodeNumber"));

  const payload: Record<string, unknown> = {
    title,
    slug: String(formData.get("slug") || "").trim() || slugify(title),
    description: String(formData.get("description") || "").trim(),
    show_notes: String(formData.get("showNotes") || ""),
    transcript: String(formData.get("transcript") || "").trim() || null,
    season: Number(formData.get("season")) || 1,
    episode_number: Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : null,
    audio_url: audio,
    duration_seconds: Number(formData.get("durationSeconds")) || null,
    cover_url: String(formData.get("coverUrl") || "").trim() || null,
    guests,
    spotify_url: spotify,
    apple_url: apple,
    youtube_url: youtube,
    status,
    published_at: publishedAtFor(status, String(formData.get("publishedAt") || "")),
  };

  const { error } = id
    ? await db.from("podcast_episodes").update(payload).eq("id", id)
    : await db.from("podcast_episodes").insert(payload);

  if (error) {
    const detail = describeError(error);
    console.error("saveEpisode error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function deleteEpisode(formData: FormData): Promise<ActionResult> {
  const db = await marketing();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Nothing was selected." };

  const { error } = await db.from("podcast_episodes").delete().eq("id", id);
  if (error) {
    const detail = describeError(error);
    console.error("deleteEpisode error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}
