import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import EmployeesClient from "./Employees.client";
import { createClient } from "@supabase/supabase-js";

const REVALIDATE_PATH = "/employees";

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  employeeCode: string | null;
  contactNumber: string | null;
  isVolunteer: boolean;
  firmId: string | null;
  firmName: string;
};

type FirmOption = { id: string; name: string };

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, firm_id")
    .eq("id", user.id)
    .single();

  if (me?.role !== "super_admin" && me?.role !== "firm_admin") redirect("/");
  return {
    role: me!.role as "super_admin" | "firm_admin",
    firmId: me!.firm_id as string | null,
  };
}

async function getEmployees({
  q,
  firmFilter,
}: {
  q?: string;
  firmFilter?: string | null;
}): Promise<EmployeeRow[]> {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      official_email,
      employee_code,
      phone,
      is_volunteer,
      role,
      firm_id,
      firms:firm_id ( name )
    `
    )
    .eq("role", "employee")
    .order("full_name", { ascending: true });

  if (q && q.trim()) query = query.ilike("full_name", `%${q}%`);
  if (firmFilter) query = query.eq("firm_id", firmFilter);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch employees:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.full_name ?? "",
    email: row.official_email ?? "",
    employeeCode: row.employee_code ?? null,
    contactNumber: row.phone ?? null,
    isVolunteer: !!row.is_volunteer,
    firmId: row.firm_id || null,
    firmName: row.firms?.name ?? "N/A",
  }));
}

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

/* -------------------- ACTIONS -------------------- */

export async function createEmployee(formData: FormData) {
  "use server";
  const me = await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const employeeCode =
    String(formData.get("employeeCode") || "").trim() || null;
  const contactNumber =
    String(formData.get("contactNumber") || "").trim() || null;
  const isVolunteer = String(formData.get("isVolunteer") || "") === "on";

  const firmIdRaw = String(formData.get("firmId") || "");
  const firmId = me.role === "super_admin" ? firmIdRaw || null : me.firmId;

  if (!name || !email || !firmId) return;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password: "Password@123",
      email_confirm: true,
      user_metadata: { full_name: name },
    }
  );
  if (createErr) {
    console.error("createUser error:", createErr.message);
    return;
  }
  const userId = created.user.id;

  // Parse the name into first and last name
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const { error: profileErr } = await admin.from("user_profiles").upsert({
    id: userId,
    email: email,
    first_name: firstName,
    last_name: lastName,
    role: "employee",
    firm_id: firmId,
    employee_code: employeeCode,
    phone: contactNumber,
    is_volunteer: isVolunteer,
  });
  if (profileErr) console.error("profile upsert error:", profileErr.message);

  revalidatePath(REVALIDATE_PATH);
}

export async function updateEmployee(formData: FormData) {
  "use server";
  const me = await requireAdmin();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const employeeCode =
    String(formData.get("employeeCode") || "").trim() || null;
  const contactNumber =
    String(formData.get("contactNumber") || "").trim() || null;
  const isVolunteer = String(formData.get("isVolunteer") || "") === "on";

  const firmIdRaw = String(formData.get("firmId") || "");
  const firmId = me.role === "super_admin" ? firmIdRaw || null : me.firmId;

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
    .from("profiles")
    .update({
      full_name: name,
      official_email: email,
      employee_code: employeeCode,
      phone: contactNumber,
      is_volunteer: isVolunteer,
      firm_id: firmId,
    })
    .eq("id", id);
  if (profileErr) console.error("profile update error:", profileErr.message);

  revalidatePath(REVALIDATE_PATH);
}

export async function deleteEmployee(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  await admin
    .from("profiles")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.error("profile delete error:", error.message);
    });

  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) console.error("deleteUser error:", delErr.message);

  revalidatePath(REVALIDATE_PATH);
}

/* ----------------------------------- PAGE ----------------------------------- */

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; firm?: string }>;
}) {
  const me = await requireAdmin();

  const sp = await searchParams;
  const q = sp?.q ?? "";
  const firmParam = sp?.firm ?? "__ALL__";
  const firmFilter =
    me.role === "super_admin"
      ? firmParam && firmParam !== "__ALL__"
        ? firmParam
        : null
      : me.firmId;

  const [employees, firms] = await Promise.all([
    getEmployees({ q, firmFilter }),
    me.role === "super_admin" ? getFirms() : Promise.resolve([]),
  ]);

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          Home &gt; Requested Classes
        </nav>
        <span className="text-3xl font-bold text-brand-blue">Employee Management</span>
      </div>
      <EmployeesClient
        employees={employees}
        firms={firms}
        isSuperAdmin={me.role === "super_admin"}
        initialQuery={q}
        initialFirm={
          me.role === "super_admin" ? firmParam : me.firmId ?? "__ALL__"
        }
        createEmployee={createEmployee}
        updateEmployee={updateEmployee}
        deleteEmployee={deleteEmployee}
      />
    </div>
  );
}
