"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Firm server actions.
 *
 * These lived in page.tsx, where add-firm-button.tsx already tried to import
 * them from "./actions" — a module that did not exist, so the Add Firm button
 * was importing from nowhere. Next.js also rejects arbitrary exports from a
 * page module, which is what the OmitWithTag route-type error was.
 */

const REVALIDATE_PATH = "/firm-management";
export async function createFirm(formData: FormData) {
  const supabase = await createServerSupabase();

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const industry = String(formData.get("industry") || "").trim() || null;
  const contactEmail =
    String(formData.get("contactEmail") || "").trim() || null;
  const phoneNumber = String(formData.get("phoneNumber") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;

  // Handle logo as base64
  const logoBase64 = String(formData.get("logo") || "").trim() || null;

  if (!name || !description) return;

  const { error } = await supabase.from("firms").insert({
    name,
    description,
    industry,
    contact_email: contactEmail,
    phone_number: phoneNumber,
    address,
    logo_url: logoBase64,
  });

  if (error) console.error("createFirm error:", error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function updateFirm(formData: FormData) {
  const supabase = await createServerSupabase();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const industry = String(formData.get("industry") || "").trim() || null;
  const contactEmail =
    String(formData.get("contactEmail") || "").trim() || null;
  const phoneNumber = String(formData.get("phoneNumber") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;

  if (!id || !name || !description) return;

  // Handle logo as base64
  const logoBase64 = String(formData.get("logo") || "").trim();
  
  const updateData: Record<string, unknown> = {
    name,
    description,
    industry,
    contact_email: contactEmail,
    phone_number: phoneNumber,
    address,
  };
  
  // Only update logo if a new one was uploaded (base64 string is not empty)
  if (logoBase64) {
    updateData.logo_url = logoBase64;
  }

  const { error } = await supabase
    .from("firms")
    .update(updateData)
    .eq("id", id);

  if (error) console.error("updateFirm error:", error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function deleteFirm(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const { error } = await supabase.from("firms").delete().eq("id", id);
  if (error) console.error("deleteFirm error:", error.message);
  revalidatePath(REVALIDATE_PATH);
}
