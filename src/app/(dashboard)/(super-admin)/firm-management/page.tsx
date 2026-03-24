// app/dashboard/super-admin/firm-management/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import FirmManagement from "./FirmManagement.client";
import type { Firm } from "@/lib/types";
import { SuperAdminGuard } from "@/components/AuthGuard";
import { Suspense } from "react";

const REVALIDATE_PATH = "/dashboard/super-admin/firm-management";

/** SSR fetch with server-side filter from URL (?q=) - Optimized */
async function getFirms(q?: string): Promise<Firm[]> {
  const supabase = await createServerSupabase();

  const startTime = Date.now();
  let query = supabase
    .from("firms")
    .select(
      "id, name, description, industry, contact_email, phone_number, address, created_at, logo_url"
    )
    .order("name") // Use name index for better performance
    .limit(100); // Add reasonable limit

  if (q && q.trim()) {
    // Case-insensitive 'contains' on name
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;
  const queryTime = Date.now() - startTime;

  if (error) {
    console.error("Failed to fetch firms:", error.message);
    return [];
  }

  console.log(`✅ Fetched ${data?.length || 0} firms in ${queryTime}ms`);
  
  // Warn if query is slow
  if (queryTime > 1000) {
    console.warn(`⚠️ Slow query detected: ${queryTime}ms for firms`);
  }

  return (data ?? []).map((f: any) => ({
    id: f.id,
    name: f.name ?? "",
    description: f.description ?? "",
    industry: f.industry ?? "",
    contactEmail: f.contact_email ?? "",
    phoneNumber: f.phone_number ?? "",
    address: f.address ?? "",
    logoUrl: f.logo_url ?? "",
    createdAt: f.created_at ?? null,
  }));
}

/* -------------------- SERVER ACTIONS -------------------- */

export async function createFirm(formData: FormData) {
  "use server";
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
  "use server";
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
  "use server";
  const supabase = await createServerSupabase();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const { error } = await supabase.from("firms").delete().eq("id", id);
  if (error) console.error("deleteFirm error:", error.message);
  revalidatePath(REVALIDATE_PATH);
}

/* ----------------------------------- PAGE ----------------------------------- */

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <img src="/loadingImg.svg" alt="Loading..." className="h-16 w-16" />
        <p className="mt-2 text-gray-600 text-lg">Loading Firm Management...</p>
      </div>
    </div>
  );
}

// Main component that loads data
async function FirmManagementContent({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const sp = await searchParams;
  const q = sp?.q ?? "";

  const firms = await getFirms(q);

  return (
    <SuperAdminGuard>
      <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2">
        <span>Home</span>
        <span>&gt;</span>
        <span>Firm Management</span>
      </nav>
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-brand-blue mb-3">
          Firm Management
        </h1>
        <FirmManagement
          firms={firms}
          initialQuery={q}
          createFirm={createFirm}
          updateFirm={updateFirm}
          deleteFirm={deleteFirm}
        />
      </div>
    </SuperAdminGuard>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FirmManagementContent searchParams={searchParams} />
    </Suspense>
  );
}
