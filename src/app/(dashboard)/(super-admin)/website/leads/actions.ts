"use server";

import { revalidatePath } from "next/cache";
import { marketing, describeError } from "../_lib/marketing";
import { explainWriteError } from "../_lib/marketing";
import type { ActionResult } from "../_lib/marketing";

/**
 * Server actions for this screen.
 *
 * Kept out of page.tsx: Next.js only permits a fixed set of exports from a
 * page module, and anything else fails the generated route type check.
 */

const REVALIDATE_PATH = "/website/leads";

export async function updateLead(formData: FormData): Promise<ActionResult> {
  const db = await marketing();

  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "No enquiry was selected." };

  const status = String(formData.get("status") || "new");

  const { error } = await db
    .from("leads")
    .update({
      status,
      owner_notes: String(formData.get("ownerNotes") || "").trim() || null,
      // Stamped the first time a lead leaves "new", so response time is
      // measurable later rather than guessed.
      contacted_at:
        status !== "new" ? String(formData.get("contactedAt") || "") || new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    const detail = describeError(error);
    console.error("updateLead error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function deleteLead(formData: FormData): Promise<ActionResult> {
  const db = await marketing();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "No enquiry was selected." };

  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) {
    const detail = describeError(error);
    console.error("deleteLead error:", detail);
    return { ok: false, error: explainWriteError(error, detail) };
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}
