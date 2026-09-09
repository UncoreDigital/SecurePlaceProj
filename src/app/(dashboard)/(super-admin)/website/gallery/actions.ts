"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { describeError, slugify } from "../_lib/marketing";
import type { ActionResult } from "./types";

// These actions need the unscoped client: table reads go through
// .schema("marketing"), but storage lives outside any Postgres schema.

/**
 * Server actions for this screen.
 *
 * Kept out of page.tsx: Next.js only permits a fixed set of exports from a
 * page module, and anything else fails the generated route type check.
 */

const REVALIDATE_PATH = "/website/gallery";

/**
 * Turns a Postgres failure into something an editor can act on.
 *
 * describeError() is right for the server log, but "[23514] new row for
 * relation ... violates check constraint albums_taken_on_not_future" tells the
 * person at the keyboard nothing about what to change. Unknown codes still fall
 * through to the raw detail rather than being hidden.
 */
function explainAlbumError(error: { code?: string; message?: string }, detail: string): string {
  switch (error.code) {
    case "23514":
      if (error.message?.includes("albums_taken_on_not_future")) {
        return "The date taken cannot be in the future. Pick today or earlier, or leave it blank.";
      }
      if (error.message?.includes("albums_published_needs_date")) {
        return "A published album needs a publish date.";
      }
      return detail;
    case "23505":
      return "That slug is already used by another album. Try a different one.";
    case "42501":
      return "Your account is not permitted to change website content. It needs the super_admin role.";
    default:
      return detail;
  }
}
const BUCKET = "marketing-media";

export async function saveAlbum(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabase();

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  const status = String(formData.get("status") || "draft");
  const takenOn = String(formData.get("takenOn") || "").trim();

  const payload: Record<string, unknown> = {
    title,
    slug: String(formData.get("slug") || "").trim() || slugify(title),
    description: String(formData.get("description") || "").trim(),
    location: String(formData.get("location") || "").trim() || null,
    // Empty string would be rejected by the date column; null means "unknown",
    // which is a legitimate state for an album.
    taken_on: takenOn || null,
    category: String(formData.get("category") || "Training").trim(),
    is_featured: formData.get("isFeatured") === "on",
    display_order: Number(formData.get("displayOrder") || 0),
    status,
    // The CHECK constraint requires a timestamp whenever status is published,
    // so stamp one here rather than letting the insert fail.
    published_at:
      status === "published"
        ? String(formData.get("publishedAt") || "") || new Date().toISOString()
        : null,
  };

  const { error } = id
    ? await supabase.schema("marketing").from("gallery_albums").update(payload).eq("id", id)
    : await supabase.schema("marketing").from("gallery_albums").insert(payload);

  if (error) {
    const detail = describeError(error);
    console.error("saveAlbum error:", detail);
    return { ok: false, error: explainAlbumError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function deleteAlbum(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabase();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "No album selected." };

  // Remove the stored objects first. The rows cascade with the album, so doing
  // this afterwards would leave orphaned files in the bucket with nothing
  // pointing at them.
  const { data: photos } = await supabase
    .schema("marketing")
    .from("gallery_photos")
    .select("storage_path")
    .eq("album_id", id);

  const paths = (photos ?? []).map((p: any) => p.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) console.error("deleteAlbum storage error:", storageError.message);
  }

  const { error } = await supabase
    .schema("marketing")
    .from("gallery_albums")
    .delete()
    .eq("id", id);

  if (error) {
    const detail = describeError(error);
    console.error("deleteAlbum error:", detail);
    return { ok: false, error: detail };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function addPhoto(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabase();

  const albumId = String(formData.get("albumId") || "");
  const storagePath = String(formData.get("storagePath") || "");
  const alt = String(formData.get("alt") || "").trim();

  // Enforced by a CHECK constraint too, but failing here gives the editor a
  // reason rather than a database error.
  if (!albumId || !storagePath || !alt) {
    return { ok: false, error: "Album, uploaded file and alt text are all required." };
  }

  const { error } = await supabase
    .schema("marketing")
    .from("gallery_photos")
    .insert({
      album_id: albumId,
      storage_path: storagePath,
      alt,
      caption: String(formData.get("caption") || "").trim() || null,
      width: Number(formData.get("width")) || null,
      height: Number(formData.get("height")) || null,
      display_order: Number(formData.get("displayOrder") || 0),
    });

  if (error) {
    const detail = describeError(error);
    console.error("addPhoto error:", detail);
    return { ok: false, error: detail };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function updatePhoto(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabase();

  const id = String(formData.get("id") || "");
  const alt = String(formData.get("alt") || "").trim();
  if (!id || !alt) return { ok: false, error: "Alt text is required." };

  const { error } = await supabase
    .schema("marketing")
    .from("gallery_photos")
    .update({
      alt,
      caption: String(formData.get("caption") || "").trim() || null,
      display_order: Number(formData.get("displayOrder") || 0),
    })
    .eq("id", id);

  if (error) {
    const detail = describeError(error);
    console.error("updatePhoto error:", detail);
    return { ok: false, error: detail };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function deletePhoto(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabase();

  const id = String(formData.get("id") || "");
  const storagePath = String(formData.get("storagePath") || "");
  if (!id) return { ok: false, error: "No photo selected." };

  if (storagePath) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (storageError) console.error("deletePhoto storage error:", storageError.message);
  }

  const { error } = await supabase
    .schema("marketing")
    .from("gallery_photos")
    .delete()
    .eq("id", id);

  if (error) {
    const detail = describeError(error);
    console.error("deletePhoto error:", detail);
    return { ok: false, error: detail };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function setCoverPhoto(formData: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabase();

  const albumId = String(formData.get("albumId") || "");
  const photoId = String(formData.get("photoId") || "");
  if (!albumId || !photoId) return { ok: false, error: "No photo selected." };

  const { error } = await supabase
    .schema("marketing")
    .from("gallery_albums")
    .update({ cover_photo_id: photoId })
    .eq("id", albumId);

  if (error) {
    const detail = describeError(error);
    console.error("setCoverPhoto error:", detail);
    return { ok: false, error: detail };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}
