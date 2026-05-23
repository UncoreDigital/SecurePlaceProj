import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import SafetyClassDetails from "./SafetyClassDetails";
import { SafetyClass } from "../types";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

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

  if (
    me?.role !== "super_admin" &&
    me?.role !== "firm_admin" &&
    me?.role !== "location_admin"
  )
    redirect("/");
  return {
    role: me!.role as "super_admin" | "firm_admin" | "location_admin",
    firmId: me!.firm_id as string | null,
  };
}

async function getSafetyClass(id: string, firmId: string | null): Promise<SafetyClass | null> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from("safety_classes")
    .select("*")
    .eq("id", id)
    .eq("is_active", true);

  // if (firmId) {
  //   query = query.eq("firm_id", firmId);
  // }

  const { data: safetyClass, error } = await query.single();

  if (error) {
    console.error("Error fetching safety class:", error);
    return null;
  }

  return safetyClass;
}

async function getFirmLocations(id: string, firmId: string | null): Promise<any[] | null> {
  const supabase = await createServerSupabase();
  //Get locations according to logged in user's firm
  let query = supabase
    .from("locations")
    .select("id, name, address")
    .eq("firm_id", firmId)
    .eq("is_active", true)
    .limit(20);

  // if (firmId) {  
  //   query = query.eq("firm_id", firmId);
  // }

  const { data: locations, error } = await query;
  
  console.log("Fetched locations for firm:", locations);
  if (error) {
    console.error("Error fetching locations:", error);
    return null;
  }

  return locations;
}

async function getFormStatus(safetyClassId: string): Promise<{ id: string } | null> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("class_forms")
    .select("id")
    .eq("safety_class_id", safetyClassId)
    .eq("is_active", true)
    .maybeSingle();
  return data ?? null;
}

export default async function SafetyClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;

  const [safetyClass, locations, existingForm] = await Promise.all([
    getSafetyClass(id, me.firmId),
    getFirmLocations(id, me.firmId),
    me.role === "super_admin" ? getFormStatus(id) : Promise.resolve(null),
  ]);

  if (!safetyClass) {
    redirect("/safety-classes");
  }

  return (
    <div className="container mx-auto">
      <SafetyClassDetails
        safetyClass={safetyClass}
        isSuperAdmin={me.role === "super_admin"}
        currentFirmId={me.firmId || ""}
        locations={locations ?? []}
        hasForm={!!existingForm}
      />
    </div>
  );
}
