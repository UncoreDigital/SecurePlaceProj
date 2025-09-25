// app/dashboard/super-admin/firm-management/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import FirmManagement from "./FirmManagement.client";
import type { Firm } from "@/lib/types";

const REVALIDATE_PATH = "/dashboard/super-admin/firm-management";

/** Guard: only super_admin may access this page */
async function requireSuperAdmin() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "super_admin") {
    redirect("/");
  }
}

/** SSR fetch with server-side filter from URL (?q=) */
async function getFirms(q?: string): Promise<Firm[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("firms")
    .select(
      "id, name, industry, contact_email, phone_number, address, created_at"
    )
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    // Case-insensitive 'contains' on name
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch firms:", error.message);
    return [];
  }

  return (data ?? []).map((f: any) => ({
    id: f.id,
    name: f.name ?? "",
    industry: f.industry ?? "",
    contactEmail: f.contact_email ?? "",
    phoneNumber: f.phone_number ?? "",
    address: f.address ?? "",
    createdAt: f.created_at ?? null,
  }));
}

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
  await requireSuperAdmin();
  const sp = await searchParams;
  const q = sp?.q ?? "";

  const firms = await getFirms(q);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-brand-blue mb-6">
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
  );
}
