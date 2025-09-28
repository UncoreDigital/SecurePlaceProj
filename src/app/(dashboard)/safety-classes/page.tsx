import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import SafetyClassesClient from "./SafetyClasses.client";
import { revalidatePath } from "next/cache";
import { SafetyClass } from "./types";

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

async function getSafetyClasses({
  firmId,
}: {
  firmId?: string | null;
}): Promise<SafetyClass[]> {
  const supabase = await createServerSupabase();
  
  let query = supabase
    .from("safety_classes")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // if (firmId) {
  //   query = query.eq("firm_id", firmId);
  // }

  const { data: safetyClasses, error } = await query;

  if (error) {
    console.error("Error fetching safety classes:", error);
    return [];
  }

  return safetyClasses || [];
}

// Server action to create a new safety class
export async function createSafetyClass(formData: FormData) {
  "use server";
  const me = await requireAdmin();

  // For super admins, firmId can be null
  const firmId = me.firmId;

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const videoUrl = String(formData.get("videoUrl") || "").trim();
  const duration = parseInt(String(formData.get("duration") || "0"));
  const isRequired = String(formData.get("isRequired") || "") === "on";
  const thumbnailUrl = String(formData.get("thumbnailUrl") || "").trim();

  if (!title || !description || !videoUrl || duration <= 0) {
    throw new Error("Please fill in all required fields");
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  console.log({ thumbnailUrl });
  const { error } = await admin.from("safety_classes").insert({
    firm_id: firmId ?? null, // Allow null
    title,
    description,
    video_url: videoUrl,
    duration_minutes: duration,
    is_required: isRequired,
    thumbnail_url: thumbnailUrl || null,
  });

  if (error) {
    console.error("Error creating safety class:", error);
    throw new Error("Failed to create safety class");
  }

  revalidatePath("/safety-classes");
}

export default async function SafetyClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string }>;
}) {
  const me = await requireAdmin();
  const sp = await searchParams;
  
  const category = sp?.category ?? "all";
  const type = sp?.type ?? "in-person"; // "remote" or "in-person"
  const isRemote = type === "remote";

  const safetyClasses = await getSafetyClasses({
    firmId: me.firmId,
  });

  return (
    <div className="container mx-auto">
      <SafetyClassesClient
        safetyClasses={safetyClasses}
        initialCategory={category}
        initialType={type}
        isSuperAdmin={me.role === "super_admin"}
        createSafetyClass={createSafetyClass}
      />
    </div>
  );
}
