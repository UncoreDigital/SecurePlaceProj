"use server";

import { revalidatePath } from "next/cache";
import {
  marketing,
  describeError,
  publishedAtFor,
  readingMinutes,
  slugify,
} from "../_lib/marketing";
import { explainWriteError } from "../_lib/marketing";
import type { ActionResult } from "../_lib/marketing";

/**
 * Server actions live here rather than in page.tsx.
 *
 * Next.js only permits a fixed set of exports from a page module (default,
 * metadata, generateStaticParams and friends). Exporting actions from the page
 * still runs, but it fails the generated route type check — which is what those
 * OmitWithTag errors in .next/types were.
 */

const REVALIDATE_PATH = "/website/blogs";

export async function savePost(formData: FormData): Promise<ActionResult> {
  const db = await marketing();

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  const body = String(formData.get("body") || "");
  const status = String(formData.get("status") || "draft");

  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const payload: Record<string, unknown> = {
    title,
    slug: String(formData.get("slug") || "").trim() || slugify(title),
    excerpt: String(formData.get("excerpt") || "").trim(),
    body,
    cover_url: String(formData.get("coverUrl") || "").trim() || null,
    author_name: String(formData.get("authorName") || "").trim() || "Secure Place to Work",
    author_role: String(formData.get("authorRole") || "").trim() || null,
    category: String(formData.get("category") || "General").trim(),
    tags,
    // Derived rather than typed: an author should not have to estimate this,
    // and a hand-entered number drifts the moment the body is edited.
    reading_minutes: readingMinutes(body),
    is_featured: formData.get("isFeatured") === "on",
    seo_title: String(formData.get("seoTitle") || "").trim() || null,
    seo_description: String(formData.get("seoDescription") || "").trim() || null,
    status,
    published_at: publishedAtFor(status, String(formData.get("publishedAt") || "")),
  };

  const { error } = id
    ? await db.from("posts").update(payload).eq("id", id)
    : await db.from("posts").insert(payload);

  if (error) {
    const detail = describeError(error);
    console.error("savePost error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function deletePost(formData: FormData): Promise<ActionResult> {
  const db = await marketing();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Nothing was selected." };

  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) {
    const detail = describeError(error);
    console.error("deletePost error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

/** One-click publish / unpublish from the list, without opening the editor. */
export async function togglePostStatus(formData: FormData): Promise<ActionResult> {
  const db = await marketing();

  const id = String(formData.get("id") || "");
  const next = String(formData.get("next") || "draft");
  if (!id) return { ok: false, error: "Nothing was selected." };

  const { error } = await db
    .from("posts")
    .update({ status: next, published_at: publishedAtFor(next) })
    .eq("id", id);

  if (error) {
    const detail = describeError(error);
    console.error("togglePostStatus error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}
