// app/dashboard/super-admin/firm-admins/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import FirmAdminsClient from "./FirmAdmins.client";
import { createClient } from "@supabase/supabase-js";
import type { FirmOption, FirmAdminRow } from "@/lib/types";

const REVALIDATE_PATH = "/dashboard/super-admin/firm-admins";

/** Guard: only super_admin may access this page */
async function requireSuperAdmin() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "super_admin") {
    redirect("/");
  }
}

/** SSR: list firm admins with server-side filters from URL (?q=, ?firm=) */
async function getFirmAdmins(
  q?: string,
  firmId?: string
): Promise<FirmAdminRow[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("user_profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      official_email,
      role,
      firm_id,
      firms:firm_id ( name )
    `
    )
    .eq("role", "firm_admin")
    .order("first_name", { ascending: true });

  if (q && q.trim()) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }
  if (firmId && firmId !== "__ALL__") {
    query = query.eq("firm_id", firmId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch firm admins:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    email: row.official_email ?? "",
    firmId: row.firm_id || null,
    firmName: row.firms?.name ?? "N/A",
  }));
}

/** SSR: list firms for dropdown */
async function getFirms(): Promise<FirmOption[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("firms")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch firms:", error.message);
    return [];
  }
  return (data ?? []).map((f: any) => ({ id: f.id, name: f.name ?? "" }));
}

/* -------------------- SERVER ACTIONS -------------------- */

export async function createFirmAdmin(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const firmId = String(formData.get("firmId") || "");

  if (!name || !email || !password || !firmId) return;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    }
  );
  if (createErr) {
    console.error("createUser error:", createErr.message);
    return;
  }
  const userId = created.user.id;

  const { error: profileErr } = await admin.from("user_profiles").upsert({
    id: userId,
    email: email,
    first_name: name.split(' ')[0] || '',
    last_name: name.split(' ').slice(1).join(' ') || '',
    official_email: email,
    role: "firm_admin",
    firm_id: firmId,
    is_active: true,
  });
  if (profileErr) console.error("profile upsert error:", profileErr.message);

  revalidatePath(REVALIDATE_PATH);
}

export async function updateFirmAdmin(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const firmId = String(formData.get("firmId") || "") || null;

  if (!id || !name || !email) return;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: authErr } = await admin.auth.admin.updateUserById(id, {
    email,
    user_metadata: { full_name: name },
  });
  if (authErr) console.error("updateUserById error:", authErr.message);

  const { error: profileErr } = await admin
    .from("user_profiles")
    .update({
      first_name: name.split(' ')[0] || '',
      last_name: name.split(' ').slice(1).join(' ') || '',
      official_email: email,
      firm_id: firmId,
    })
    .eq("id", id);
  if (profileErr) console.error("profile update error:", profileErr.message);

  revalidatePath(REVALIDATE_PATH);
}

export async function deleteFirmAdmin(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  if (!id) return;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  await admin
    .from("user_profiles")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.error("profile delete error:", error.message);
    });

  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) console.error("deleteUser error:", delErr.message);

  revalidatePath(REVALIDATE_PATH);
}

export default async function Page({
  searchParams,
}: {
  searchParams?: { q?: string; firm?: string };
}) {
  await requireSuperAdmin();

  const sp = await searchParams;
  const q = sp?.q ?? "";
  const firm = sp?.firm ?? "__ALL__";

  const [admins, firms] = await Promise.all([
    getFirmAdmins(q, firm),
    getFirms(),
  ]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-brand-blue mb-6">
        Firm Admin Management
      </h1>
      <FirmAdminsClient
        admins={admins}
        firms={firms}
        initialQuery={q}
        initialFirm={firm}
        createFirmAdmin={createFirmAdmin}
        updateFirmAdmin={updateFirmAdmin}
        deleteFirmAdmin={deleteFirmAdmin}
      />
    </div>
  );
}
