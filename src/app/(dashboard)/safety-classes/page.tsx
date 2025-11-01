import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import SafetyClassesClient from "./SafetyClasses.client";
import { revalidatePath } from "next/cache";
import { SafetyClass } from "./types";
import { Suspense } from "react";

// Force dynamic rendering for this page since it uses auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// Simple function to get safety classes (NO CACHE)
async function getSafetyClasses({
  firmId,
}: {
  firmId?: string | null;
}): Promise<SafetyClass[]> {
  const supabase = await createServerSupabase();
  
  try {
    const startTime = Date.now();
    
    let query = supabase
      .from("safety_classes")
      .select(`
        id,
        title,
        duration_minutes,
        is_required,
        thumbnail_url,
        type,
        mode,
        created_at,
        description,
        video_url,
        is_active,
        updated_at,
        firm_id
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: safetyClasses, error } = await query;
    const queryTime = Date.now() - startTime;
    
    if (error) {
      console.error("Error fetching safety classes:", error);
      throw new Error(`Failed to fetch safety classes: ${error.message}`);
    }

    console.log(`✅ Fetched ${safetyClasses?.length || 0} safety classes in ${queryTime}ms`);
    
    if (queryTime > 1000) {
      console.warn(`⚠️ Slow query detected: ${queryTime}ms for safety classes`);
    }
    
    return safetyClasses || [];
  } catch (error) {
    console.error("Unexpected error in getSafetyClasses:", error);
    return [];
  }
}

// Server action to create a new safety class
export async function createSafetyClass(formData: FormData) {
  "use server";
  const me = await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const videoUrl = String(formData.get("videoUrl") || "").trim();
  const duration = parseInt(String(formData.get("duration") || "0"));
  const isRequired = String(formData.get("isRequired") || "") === "on";
  const thumbnailUrl = String(formData.get("thumbnailUrl") || "").trim();
  const type = String(formData.get("type") || "Safety Class").trim();
  const mode = String(formData.get("mode") || "Remote").trim();

  if (!title || !description || !videoUrl || duration <= 0) {
    throw new Error("Please fill in all required fields");
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  const { error } = await admin.from("safety_classes").insert({
    firm_id: me.firmId ?? null,
    title,
    description,
    video_url: videoUrl,
    duration_minutes: duration,
    is_required: isRequired,
    thumbnail_url: thumbnailUrl || null,
    type: type as "Safety Class" | "Drill",
    mode: mode as "Remote" | "InPerson",
  });
  
  if (error) {
    console.error("Error creating safety class:", error);
    throw new Error("Failed to create safety class");
  }

  revalidatePath("/safety-classes");
}

// Server action to update an existing safety class
export async function updateSafetyClass(formData: FormData) {
  "use server";
  const me = await requireAdmin();

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const videoUrl = String(formData.get("videoUrl") || "").trim();
  const duration = parseInt(String(formData.get("duration") || "0"));
  const isRequired = String(formData.get("isRequired") || "") === "on";
  const thumbnailUrl = String(formData.get("thumbnailUrl") || "").trim();
  const type = String(formData.get("type") || "Safety Class").trim();
  const mode = String(formData.get("mode") || "Remote").trim();

  if (!id || !title || !description || !videoUrl || duration <= 0) {
    throw new Error("Please fill in all required fields");
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  const { error } = await admin.from("safety_classes").update({
    title,
    description,
    video_url: videoUrl,
    duration_minutes: duration,
    is_required: isRequired,
    thumbnail_url: thumbnailUrl || null,
    type: type as "Safety Class" | "Drill",
    mode: mode as "Remote" | "InPerson",
  }).eq("id", id);
  
  if (error) {
    console.error("Error updating safety class:", error);
    throw new Error("Failed to update safety class");
  }

  revalidatePath("/safety-classes");
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 text-lg">Loading Safety Classes...</p>
      </div>
    </div>
  );
}

// Main component that loads data
async function SafetyClassesContent({
  searchParams,
}: {
  searchParams: { category?: string; type?: string };
}) {
  const me = await requireAdmin();
  const category = searchParams?.category ?? "all";
  const type = searchParams?.type ?? "remote";
  
  const safetyClasses = await getSafetyClasses({ firmId: me.firmId });

  return (
    <div className="container mx-auto">
      <SafetyClassesClient
        safetyClasses={safetyClasses}
        initialCategory={category}
        initialType={type}
        isSuperAdmin={me.role === "super_admin"}
        createSafetyClass={createSafetyClass}
        updateSafetyClass={updateSafetyClass}
      />
    </div>
  );
}

export default function SafetyClassesPage({
  searchParams,
}: {
  searchParams: { category?: string; type?: string };
}) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SafetyClassesContent searchParams={searchParams} />
    </Suspense>
  );
}
