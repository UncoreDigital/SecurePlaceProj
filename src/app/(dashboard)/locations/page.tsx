// app/dashboard/locations/page.tsx
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { AdminGuard } from "@/components/AuthGuard";
import type { Location } from "./columns";
import LocationsClient from "./Locations.client";
import { Suspense } from "react";

const REVALIDATE_PATH = "/dashboard/locations";

/** SSR: list locations with server-side filters */
async function getLocations(): Promise<Location[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('locations')
    .select(`
      id,
      firm_id,
      name,
      address,
      latitude,
      longitude,
      description,
      is_active,
      created_at,
      updated_at,
      firms:firm_id (
        id,
        name
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to fetch locations:", error.message);
    return [];
  }

  // Transform the data to match Location interface
  return (data ?? []).map((location: any) => ({
    ...location,
    firms: Array.isArray(location.firms) ? location.firms[0] : location.firms
  }));
}

/* -------------------- SERVER ACTIONS -------------------- */

export async function createLocation(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const description = String(formData.get("contact") || "").trim();
  const firmId = String(formData.get("firmId") || "");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const latitude = parseFloat(String(formData.get("latitude") || "0"));
  const longitude = parseFloat(String(formData.get("longitude") || "0"));

  if (!name || !address || !firmId || !email || !password) return;

  const supabase = await createServerSupabase();
  const adminSupabase = createAdminSupabase();

  // 1) Create Supabase auth user for this location
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error("create location auth user error:", authError.message);
    throw new Error(authError.message);
  }

  const authUserId = authData.user.id;

  // 2) Insert user_profiles row with location_admin role
  const { error: profileError } = await adminSupabase.from("user_profiles").insert({
    id: authUserId,
    email,
    first_name: name,
    last_name: "",
    role: "location_admin",
    firm_id: firmId,
    is_active: true,
  });

  if (profileError) {
    console.error("create location profile error:", profileError.message);
    // Rollback: delete the auth user we just created
    await adminSupabase.auth.admin.deleteUser(authUserId);
    throw new Error(profileError.message);
  }

  // 3) Insert the location row
  const { error } = await supabase.from("locations").insert({
    name,
    address,
    description,
    firm_id: firmId,
    latitude,
    longitude,
    is_active: true,
  });

  if (error) {
    console.error("create location error:", error.message);
    throw new Error(error.message);
  }

  revalidatePath(REVALIDATE_PATH);
}

export async function updateLocation(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const description = String(formData.get("contact") || "").trim();
  const latitude = parseFloat(String(formData.get("latitude") || "0"));
  const longitude = parseFloat(String(formData.get("longitude") || "0"));

  if (!id || !name || !address) return;

  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("locations")
    .update({
      name,
      address,
      description,
      latitude,
      longitude,
    })
    .eq("id", id);

  if (error) console.error("update location error:", error.message);

  revalidatePath(REVALIDATE_PATH);
}

export async function deleteLocation(formData: FormData) {
  "use server";
  
  const id = String(formData.get("id") || "");
  if (!id) {
    throw new Error("Location ID is required");
  }

  const supabase = await createServerSupabase();
  
  const { error } = await supabase
    .from("locations")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("delete location error:", error.message);
    throw new Error(`Failed to delete location: ${error.message}`);
  }

  revalidatePath(REVALIDATE_PATH);
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <img src="/loadingImg.svg" alt="Loading..." className="h-16 w-16" />
        <p className="mt-2 text-gray-600 text-lg">Loading Locations...</p>
      </div>
    </div>
  );
}

// Main component that loads data
async function LocationsContent() {
  const locations = await getLocations();

  return (
    <AdminGuard>
      <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2">
        <span>Home</span>
        <span>&gt;</span>
        <span>Location Management</span>
      </nav>
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-brand-blue mb-3">
          Location Management
        </h1>
        <LocationsClient
          locations={locations}
          createLocation={createLocation}
          updateLocation={updateLocation}
          deleteLocation={deleteLocation}
        />
      </div>
    </AdminGuard>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LocationsContent />
    </Suspense>
  );
}
