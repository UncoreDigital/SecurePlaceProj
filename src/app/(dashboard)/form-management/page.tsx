import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import FormManagementClient from "./FormManagementClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireSuperAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "super_admin") redirect("/safety-classes");
}

export default async function FormManagementPage() {
  await requireSuperAdmin();

  const supabase = adminClient();

  // Fetch all active safety classes
  const { data: safetyClasses } = await supabase
    .from("safety_classes")
    .select("id, title, mode, type, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Fetch all active forms (to know which classes already have a form)
  const { data: forms } = await supabase
    .from("class_forms")
    .select("id, safety_class_id, title, pass_score, is_active")
    .eq("is_active", true);

  const formBySafetyClassId = Object.fromEntries(
    (forms ?? []).map((f) => [f.safety_class_id, f])
  );

  const classesWithFormStatus = (safetyClasses ?? []).map((sc) => ({
    ...sc,
    form: formBySafetyClassId[sc.id] ?? null,
  }));

  return (
    <div className="container mx-auto py-6 px-4">
      <FormManagementClient classes={classesWithFormStatus} />
    </div>
  );
}
