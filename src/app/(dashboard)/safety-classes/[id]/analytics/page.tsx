import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import AnalyticsClient from "./AnalyticsClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdminAccess() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("user_profiles")
    .select("role, firm_id, is_all_location_admin")
    .eq("id", user.id)
    .single();

  if (!me || !["super_admin", "firm_admin", "location_admin"].includes(me.role)) {
    redirect("/safety-classes");
  }

  // For a (non all-location) location_admin, resolve their assigned location.
  let locationId: string | null = null;
  if (me.role === "location_admin" && !me.is_all_location_admin) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    locationId = loc?.id ?? null;
  }

  return {
    role: me.role as "super_admin" | "firm_admin" | "location_admin",
    firmId: me.firm_id as string | null,
    locationId,
  };
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireAdminAccess();
  const { id: safetyClassId } = await params;

  const supabase = adminClient();

  // Fetch safety class title
  const { data: safetyClass } = await supabase
    .from("safety_classes")
    .select("id, title")
    .eq("id", safetyClassId)
    .maybeSingle();

  if (!safetyClass) redirect("/safety-classes");

  // Fetch the active form for this class
  const { data: form } = await supabase
    .from("class_forms")
    .select("id, title")
    .eq("safety_class_id", safetyClassId)
    .eq("is_active", true)
    .maybeSingle();

  if (!form) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">No Form Created Yet</h2>
        <p className="text-gray-500 text-sm mb-4">
          Create an MCQ form for this class first, then you can view analytics here.
        </p>
        {me.role === "super_admin" && (
          <a
            href={`/safety-classes/${safetyClassId}/form-builder`}
            className="inline-block bg-brand-blue text-white px-4 py-2 rounded-md text-sm hover:bg-brand-blue/90"
          >
            Create Form
          </a>
        )}
      </div>
    );
  }

  // Fetch firms (superadmin sees all, firm_admin only their firm)
  let firms: { id: string; name: string }[] = [];
  if (me.role === "super_admin") {
    const { data } = await supabase
      .from("firms")
      .select("id, name")
      .order("name", { ascending: true });
    firms = data ?? [];
  } else if (me.firmId) {
    const { data } = await supabase
      .from("firms")
      .select("id, name")
      .eq("id", me.firmId)
      .maybeSingle();
    if (data) firms = [data];
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <AnalyticsClient
        formId={form.id}
        safetyClassId={safetyClassId}
        safetyClassTitle={safetyClass.title}
        firms={firms}
        isSuperAdmin={me.role === "super_admin"}
        defaultFirmId={(me.role === "firm_admin" || me.role === "location_admin") && me.firmId ? me.firmId : undefined}
        defaultLocationId={me.locationId ?? undefined}
      />
    </div>
  );
}
