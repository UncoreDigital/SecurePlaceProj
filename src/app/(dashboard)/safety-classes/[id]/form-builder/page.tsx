import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import FormBuilderClient from "./FormBuilderClient";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireSuperAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("user_profiles")
    .select("role, firm_id")
    .eq("id", user.id)
    .single();

  if (me?.role !== "super_admin") redirect("/safety-classes");
}

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const supabase = adminClient();

  // Fetch the safety class title
  const { data: safetyClass } = await supabase
    .from("safety_classes")
    .select("id, title")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!safetyClass) redirect("/safety-classes");

  // Fetch existing form (if any)
  const { data: existingForm } = await supabase
    .from("class_forms")
    .select(`
      id, title, description, pass_score,
      form_questions (
        id, question_text, order_index,
        form_question_options (
          id, option_text, is_correct, order_index
        )
      )
    `)
    .eq("safety_class_id", id)
    .eq("is_active", true)
    .maybeSingle();

  // Fetch all firms + their active locations for per-location link generation
  const { data: firms } = await supabase
    .from("firms")
    .select("id, name, locations(id, name, is_active)")
    .order("name", { ascending: true });

  const firmsWithLocations = (firms ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    locations: ((f.locations ?? []) as any[])
      .filter((l) => l.is_active !== false)
      .map((l) => ({ id: l.id, name: l.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div className="container mx-auto py-6 px-4">
      <FormBuilderClient
        safetyClassId={id}
        safetyClassTitle={safetyClass.title}
        firms={firmsWithLocations}
        existingForm={existingForm ?? null}
      />
    </div>
  );
}
