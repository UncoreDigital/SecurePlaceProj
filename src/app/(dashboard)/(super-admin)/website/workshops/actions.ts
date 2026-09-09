"use server";

import { revalidatePath } from "next/cache";
import { marketing, describeError, publishedAtFor, slugify } from "../_lib/marketing";
import { explainWriteError } from "../_lib/marketing";
import type { ActionResult } from "../_lib/marketing";
import type { WorkshopModule } from "./types";

/**
 * Server actions for this screen.
 *
 * Kept out of page.tsx: Next.js only permits a fixed set of exports from a
 * page module, and anything else fails the generated route type check.
 */

const REVALIDATE_PATH = "/website/workshops";

export async function saveWorkshop(formData: FormData): Promise<ActionResult> {
  const db = await marketing();

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  const status = String(formData.get("status") || "draft");

  // Outcomes arrive as one per line — easier to edit than comma separated,
  // because an outcome can legitimately contain a comma.
  const outcomes = String(formData.get("outcomes") || "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

  let modules: WorkshopModule[] = [];
  try {
    const raw = String(formData.get("modules") || "[]");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) modules = parsed;
  } catch {
    // Keep the rest of the save rather than losing the whole edit to a typo
    // in the module editor.
    console.warn("Could not parse modules JSON; saving without changes to it.");
    modules = [];
  }

  const min = Number(formData.get("minParticipants"));
  const max = Number(formData.get("maxParticipants"));

  const payload: Record<string, unknown> = {
    title,
    slug: String(formData.get("slug") || "").trim() || slugify(title),
    summary: String(formData.get("summary") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    format: String(formData.get("format") || "onsite"),
    duration_minutes: Number(formData.get("durationMinutes")) || 120,
    audience: String(formData.get("audience") || "").trim() || null,
    outcomes,
    modules,
    min_participants: Number.isFinite(min) && min > 0 ? min : null,
    max_participants: Number.isFinite(max) && max > 0 ? max : null,
    cover_url: String(formData.get("coverUrl") || "").trim() || null,
    is_featured: formData.get("isFeatured") === "on",
    display_order: Number(formData.get("displayOrder") || 0),
    status,
    published_at: publishedAtFor(status, String(formData.get("publishedAt") || "")),
  };

  const { error } = id
    ? await db.from("workshops").update(payload).eq("id", id)
    : await db.from("workshops").insert(payload);

  if (error) {
    const detail = describeError(error);
    console.error("saveWorkshop error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function deleteWorkshop(formData: FormData): Promise<ActionResult> {
  const db = await marketing();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Nothing was selected." };

  const { error } = await db.from("workshops").delete().eq("id", id);
  if (error) {
    const detail = describeError(error);
    console.error("deleteWorkshop error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}
