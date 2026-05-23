import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import ResponsesClient from "./ResponsesClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdminAccess() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("user_profiles")
    .select("role, firm_id, is_all_location_admin")
    .eq("id", user.id)
    .single();

  if (!me || !["super_admin", "firm_admin", "location_admin"].includes(me.role)) {
    redirect("/safety-classes");
  }

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

export default async function ResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ firmId?: string }>;
}) {
  const me = await requireAdminAccess();
  const { id: safetyClassId } = await params;
  const { firmId: qsFirmId } = await searchParams;

  const supabase = adminClient();

  const { data: safetyClass } = await supabase
    .from("safety_classes")
    .select("id, title")
    .eq("id", safetyClassId)
    .maybeSingle();

  if (!safetyClass) redirect("/form-management");

  const { data: form } = await supabase
    .from("class_forms")
    .select("id, title")
    .eq("safety_class_id", safetyClassId)
    .eq("is_active", true)
    .maybeSingle();

  if (!form) redirect(`/safety-classes/${safetyClassId}/analytics`);

  // firm_admin and location_admin are always locked to their own firm
  const effectiveFirmId =
    me.role !== "super_admin" ? (me.firmId ?? undefined) : (qsFirmId ?? undefined);

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
      <ResponsesClient
        formId={form.id}
        safetyClassId={safetyClassId}
        safetyClassTitle={safetyClass.title}
        isSuperAdmin={me.role === "super_admin"}
        defaultFirmId={effectiveFirmId}
        defaultLocationId={me.locationId ?? undefined}
        firms={firms}
      />
    </div>
  );
}
