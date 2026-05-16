import { revalidatePath } from "next/cache";
import EmployeesClient from "./Employees.client";
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";
import { AdminGuard } from "@/components/AuthGuard";
import { generateSecurePassword, sendEmployeeWelcomeEmail } from "@/lib/email-service";
import { createServerSupabase } from "@/lib/supabase/server";

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
  locationId: string | null;
  locationName: string;
};

type FirmOption = { id: string; name: string };
type LocationOption = { id: string; name: string };

async function getLocationsByFirm(firmId: string): Promise<LocationOption[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .eq("firm_id", firmId)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    console.error("Failed to fetch locations:", error.message);
    return [];
  }
  return (data ?? []).map((loc: any) => ({ id: loc.id, name: loc.name ?? "" }));
}

async function getEmployees({
  q,
  firmFilter,
  userRole,
  userFirmId,
  locationId,
}: {
  q: string;
  firmFilter: string | null;
  userRole: string;
  userFirmId: string | null;
  locationId: string | null;
}): Promise<EmployeeRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let query = supabase
    .from("user_profiles")
    .select("id, first_name, last_name, email, employee_code, phone, is_volunteer, firm_id, location_id, firms(name)")
    .eq("role", "employee")
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  // Scope by firm for non-super-admins
  if (userRole !== "super_admin" && userFirmId) {
    query = query.eq("firm_id", userFirmId);
  } else if (firmFilter) {
    query = query.eq("firm_id", firmFilter);
  }

  // Scope by location if provided
  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  // Text search
  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,employee_code.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch employees:", error.message);
    return [];
  }

  // Fetch location names separately to avoid ambiguous FK join
  const locationIds = [...new Set((data ?? []).map((r: any) => r.location_id).filter(Boolean))];
  const locationMap: Record<string, string> = {};
  if (locationIds.length > 0) {
    const { data: locs } = await supabase
      .from("locations")
      .select("id, name")
      .in("id", locationIds);
    (locs ?? []).forEach((l: any) => { locationMap[l.id] = l.name ?? ""; });
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(" "),
    email: row.email ?? "",
    employeeCode: row.employee_code ?? null,
    contactNumber: row.phone ?? null,
    isVolunteer: row.is_volunteer ?? false,
    firmId: row.firm_id ?? null,
    firmName: row.firms?.name ?? "",
    locationId: row.location_id ?? null,
    locationName: row.location_id ? (locationMap[row.location_id] ?? "") : "",
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
  // Strip sentinel value "__ALL__" that comes from the super_admin firm filter
  let firmId = (firmIdRaw && firmIdRaw !== "__ALL__") ? firmIdRaw : null;

  const locationIdRaw = String(formData.get("locationId") || "");
  let locationId = locationIdRaw || null;

  if (!name || !email) {
    throw new Error("Name and email are required");
  }

  // Get current user context to determine firm_id and location_id
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, firm_id")
      .eq("id", user.id)
      .single();
    
    // firm_admin: always force their own firm_id
    if (profile?.role === "firm_admin" && profile?.firm_id) {
      firmId = profile.firm_id;
    }

    // location_admin: force their firm_id AND their location_id
    if (profile?.role === "location_admin") {
      // Inherit firm_id from their profile
      if (profile?.firm_id) {
        firmId = profile.firm_id;
      }
      // Resolve their location
      const { data: location } = await supabase
        .from("locations")
        .select("id, firm_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (location) {
        locationId = location.id;
        // Fallback: pick up firm_id from the location row if still null
        if (!firmId && location.firm_id) {
          firmId = location.firm_id;
        }
      }
    }
  }

  console.log('📋 Creating employee with firmId:', firmId, 'locationId:', locationId);

  // Generate secure password
  const password = generateSecurePassword();
  console.log('🔐 Generated password for', email, ':', password);

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // Resolve auth user: look up by email in user_profiles first (fast),
    // then fall back to creating a new auth user. If creation fails with
    // "already registered" we fetch the existing user by listing and matching.
    let userId: string;
    let isNewUser = false;

    // Fast path: check if a user_profiles row already exists for this email
    const { data: existingProfile } = await admin
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      // Auth user exists and already has a profile row — reuse the id
      console.log('ℹ️ Profile already exists, reusing user:', existingProfile.id);
      userId = existingProfile.id;
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: name },
        email_confirm: true,
      });
    } else {
      // Try to create a new auth user
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (createErr) {
        if (createErr.message.toLowerCase().includes("already been registered")) {
          // Auth user exists but has no profile row — find their id via listUsers
          console.log('ℹ️ Auth user exists without profile, scanning for id...');
          const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
          const match = list?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          );
          if (!match) throw new Error("Could not locate existing auth user for: " + email);
          userId = match.id;
          await admin.auth.admin.updateUserById(userId, {
            user_metadata: { full_name: name },
            email_confirm: true,
          });
        } else {
          console.error("createUser error:", createErr.message);
          throw new Error(`Failed to create user: ${createErr.message}`);
        }
      } else {
        isNewUser = true;
        userId = created.user.id;
      }
    }

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
      location_id: locationId,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.error("Profile creation error:", profileErr.message);
      // Try to clean up the created user
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create profile: ${profileErr.message}`);
    }

    // Send welcome email only for newly created auth users
    if (isNewUser) {
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
          console.log('✅ Welcome email sent successfully to:', email);
        } else {
          console.warn('⚠️ Failed to send welcome email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Email sending error:', emailError);
        // Don't throw — employee creation should still succeed
      }
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
  let firmId = (firmIdRaw && firmIdRaw !== "__ALL__") ? firmIdRaw : null;

  if (!id || !name || !email) return;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // If no firmId came from the form (non-super-admin roles don't have the selector),
  // resolve it from the logged-in user's profile or fall back to the employee's existing value
  if (!firmId) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: adminProfile } = await supabase
        .from("user_profiles")
        .select("role, firm_id")
        .eq("id", user.id)
        .single();

      if (adminProfile?.firm_id) {
        // firm_admin / location_admin — use their own firm
        firmId = adminProfile.firm_id;
      }
    }

    // Last resort: keep whatever firm_id the employee already has
    if (!firmId) {
      const { data: existing } = await admin
        .from("user_profiles")
        .select("firm_id")
        .eq("id", id)
        .single();
      firmId = existing?.firm_id ?? null;
    }
  }

  const nameParts = name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Update auth user
  const { error: authErr } = await admin.auth.admin.updateUserById(id, {
    email,
    user_metadata: { full_name: name },
  });
  if (authErr) console.error("updateUserById error:", authErr.message);

  // Update user_profiles (the real table, not the profiles view)
  const { error: profileErr } = await admin
    .from("user_profiles")
    .update({
      email,
      first_name: firstName,
      last_name: lastName,
      employee_code: employeeCode,
      phone: contactNumber,
      is_volunteer: isVolunteer,
      firm_id: firmId,
      updated_at: new Date().toISOString(),
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

  // Delete from user_profiles (cascades via FK, no need to touch the view)
  const { error: profileErr } = await admin
    .from("user_profiles")
    .delete()
    .eq("id", id);
  if (profileErr) console.error("profile delete error:", profileErr.message);

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
  searchParams: Promise<{ q?: string; firm?: string; location_id?: string }>;
}) {
  const sp = await searchParams;
  const q = sp?.q ?? "";
  const firmParam = sp?.firm ?? "__ALL__";
  const firmFilter = firmParam && firmParam !== "__ALL__" ? firmParam : null;
  const locationId = sp?.location_id ?? null;

  // Get current user context
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userRole = "employee";
  let userFirmId = null;
  let isSuperAdmin = false;
  let dashboardLocationId: string | null = null;
  let dashboardLocationName = "";

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, firm_id")
      .eq("id", user.id)
      .single();
    
    if (profile) {
      userRole = profile.role;
      userFirmId = profile.firm_id;
      isSuperAdmin = profile.role === "super_admin";

      // Get location for location_admin
      if (profile.role === "location_admin") {
        const { data: location } = await supabase
          .from("locations")
          .select("id, name")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (location) {
          dashboardLocationId = location.id;
          dashboardLocationName = location.name || "";
        }
      }
    }
  }

  // Fetch locations for firm admin
  let locations: LocationOption[] = [];
  if (userFirmId && (userRole === "firm_admin" || userRole === "location_admin")) {
    locations = await getLocationsByFirm(userFirmId);
  }

  const [employees, firms] = await Promise.all([
    getEmployees({ q, firmFilter, userRole, userFirmId, locationId }),
    getFirms(),
  ]);

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          Home &gt; Employee Management
        </nav>
        <span className="text-3xl font-bold text-brand-blue">Employee Management</span>
      </div>
      <EmployeesClient
        employees={employees}
        firms={firms}
        locations={locations}
        isSuperAdmin={isSuperAdmin}
        initialQuery={q}
        initialFirm={isSuperAdmin ? firmParam : userFirmId || ""}
        createEmployee={createEmployee}
        updateEmployee={updateEmployee}
        deleteEmployee={deleteEmployee}
        dashboardLocationId={dashboardLocationId}
        dashboardLocationName={dashboardLocationName}
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