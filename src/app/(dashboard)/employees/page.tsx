import { revalidatePath } from "next/cache";
import EmployeesClient from "./Employees.client";
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";
import { AdminGuard } from "@/components/AuthGuard";
import { generateSecurePassword, sendEmployeeWelcomeEmail } from "@/lib/email-service";

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

async function getEmployees({
  q,
  firmFilter,
}: {
  q?: string;
  firmFilter?: string | null;
}): Promise<EmployeeRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
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
  const firmId = firmIdRaw || null;

  if (!name || !email) {
    throw new Error("Name and email are required");
  }

  // Generate secure password
  const password = generateSecurePassword();
  console.log('🔐 Generated password for', email, ':', password);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // Create user with generated password
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    
    if (createErr) {
      console.error("createUser error:", createErr.message);
      throw new Error(`Failed to create user: ${createErr.message}`);
    }
    
    const userId = created.user.id;

    // Parse the name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create profile
    const { error: profileErr } = await admin.from("user_profiles").upsert({
      id: userId,
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: "employee",
      employee_code: employeeCode,
      phone: contactNumber,
      is_volunteer: isVolunteer,
      firm_id: firmId,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.error("Profile creation error:", profileErr.message);
      // Try to clean up the created user
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create profile: ${profileErr.message}`);
    }

    // Also create in profiles table (for compatibility)
    const { error: profileErr2 } = await admin.from("profiles").upsert({
      id: userId,
      full_name: name,
      official_email: email,
      role: "employee",
      firm_id: firmId,
      employee_code: employeeCode,
      phone: contactNumber,
      is_volunteer: isVolunteer,
      created_at: new Date().toISOString(),
    });

    if (profileErr2) {
      console.warn("Secondary profile creation warning:", profileErr2.message);
    }

    // Send welcome email with credentials
    try {
      console.log('📧 Sending welcome email to:', email);
      
      // Get firm name for email
      let firmName = "Your Organization";
      if (firmId) {
        const { data: firm } = await admin
          .from("firms")
          .select("name")
          .eq("id", firmId)
          .single();
        if (firm?.name) {
          firmName = firm.name;
        }
      }

      const emailResult = await sendEmployeeWelcomeEmail({
        employeeName: name,
        employeeEmail: email,
        password: password,
        firmName: firmName,
        loginUrl: process.env.NEXT_PUBLIC_APP_URL || "https://secure-place-proj.vercel.app/"
      });

      if (emailResult.success) {
        console.log('✅ Welcome email sent successfully to:');
      } else {
        console.warn('⚠️ Failed to send welcome email:', emailResult.error);
        // Don't throw error - user creation should still succeed
      }
      
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      // Don't throw error - user creation should still succeed
    }

    console.log('✅ Employee created successfully:');

  } catch (error: any) {
    console.error('❌ Employee creation failed:', error);
    throw error;
  }

  revalidatePath(REVALIDATE_PATH);
}

export async function updateEmployee(formData: FormData) {
  "use server";

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
  const firmId = firmIdRaw || null;

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

function LoadingSpinner() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <img src="/loadingImg.svg" alt="Loading..." className="h-16 w-16" />
        <p className="mt-2 text-gray-600 text-lg">Loading Employees...</p>
      </div>
    </div>
  );
}

async function EmployeesContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; firm?: string }>;
}) {
  const sp = await searchParams;
  const q = sp?.q ?? "";
  const firmParam = sp?.firm ?? "__ALL__";
  const firmFilter = firmParam && firmParam !== "__ALL__" ? firmParam : null;

  const [employees, firms] = await Promise.all([
    getEmployees({ q, firmFilter }),
    getFirms(),
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
        isSuperAdmin={true} // Will be controlled by AdminGuard
        initialQuery={q}
        initialFirm={firmParam}
        createEmployee={createEmployee}
        updateEmployee={updateEmployee}
        deleteEmployee={deleteEmployee}
      />
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; firm?: string }>;
}) {
  return (
    <AdminGuard>
      <Suspense fallback={<LoadingSpinner />}>
        <EmployeesContent searchParams={searchParams} />
      </Suspense>
    </AdminGuard>
  );
}
