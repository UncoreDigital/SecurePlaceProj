// app/dashboard/super-admin/firm-management/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath, cache } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import FirmManagement from "./FirmManagement.client";
import type { Firm } from "@/lib/types";
import { SuperAdminGuard } from "@/components/AuthGuard";

const REVALIDATE_PATH = "/dashboard/super-admin/firm-management";

/** SSR fetch with server-side filter from URL (?q=) - Cached and optimized */
const getFirms = cache(async (q?: string): Promise<Firm[]> => {
  const supabase = await createServerSupabase();

  const startTime = Date.now();
  let query = supabase
    .from("firms")
    .select(
      "id, name, industry, contact_email, phone_number, created_at"
    ) // Removed address to reduce payload
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
    industry: f.industry ?? "",
    contactEmail: f.contact_email ?? "",
    phoneNumber: f.phone_number ?? "",
    address: "", // Removed from query to reduce payload
    createdAt: f.created_at ?? null,
  }));
});

/* -------------------- SERVER ACTIONS -------------------- */

export async function createFirm(formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();

  const name = String(formData.get("name") || "").trim();
  const industry = String(formData.get("industry") || "").trim() || null;
  const contactEmail =
    String(formData.get("contactEmail") || "").trim() || null;
  const phoneNumber = String(formData.get("phoneNumber") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;

  if (!name) return;

  const { error } = await supabase.from("firms").insert({
    name,
    industry,
    contact_email: contactEmail,
    phone_number: phoneNumber,
    address,
  });

  if (error) console.error("createFirm error:", error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function updateFirm(formData: FormData) {
  "use server";
  const supabase = await createServerSupabase();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const industry = String(formData.get("industry") || "").trim() || null;
  const contactEmail =
    String(formData.get("contactEmail") || "").trim() || null;
  const phoneNumber = String(formData.get("phoneNumber") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;

  if (!id || !name) return;

  const { error } = await supabase
    .from("firms")
    .update({
      name,
      industry,
      contact_email: contactEmail,
      phone_number: phoneNumber,
      address,
    })
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

export default async function Page({
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
