// app/dashboard/locations/page.tsx
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdminGuard } from "@/components/AuthGuard";
import type { Location } from "./columns";
import LocationsClient from "./Locations.client";

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
  const description = String(formData.get("description") || "").trim();
  const firmId = String(formData.get("firmId") || "");
  const latitude = parseFloat(String(formData.get("latitude") || "0"));
  const longitude = parseFloat(String(formData.get("longitude") || "0"));

  if (!name || !address || !firmId) return;

  const supabase = await createServerSupabase();

  const { error } = await supabase.from("locations").insert({
    name,
    address,
    description,
    firm_id: firmId,
    latitude,
    longitude,
    is_active: true,
  });

  if (error) console.error("create location error:", error.message);

  revalidatePath(REVALIDATE_PATH);
}

export async function updateLocation(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const description = String(formData.get("description") || "").trim();
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
  if (!id) return;

  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("locations")
    .update({ is_active: false })
    .eq("id", id);

  if (error) console.error("delete location error:", error.message);

  revalidatePath(REVALIDATE_PATH);
}

export default async function Page() {
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
