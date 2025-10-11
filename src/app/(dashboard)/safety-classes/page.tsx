import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import SafetyClassesClient from "./SafetyClasses.client";
import { revalidatePath } from "next/cache";
import { SafetyClass } from "./types";
import { cache } from "react";

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

// Cache the function to avoid repeated database calls
const getSafetyClasses = cache(async ({
  firmId,
}: {
  firmId?: string | null;
}): Promise<SafetyClass[]> => {
  const supabase = await createServerSupabase();
  
  try {
    // Optimized query with specific columns and better indexing
    let query = supabase
      .from("safety_classes")
      .select(`
        id,
        title,
        description,
        video_url,
        thumbnail_url,
        duration_minutes,
        is_required,
        is_active,
        firm_id,
        created_at,
        updated_at,
        type,
        mode
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50); // Add reasonable limit to prevent large data loads

    const { data: safetyClasses, error } = await query;
    if (error) {
      console.error("Error fetching safety classes:", error);
      throw new Error(`Failed to fetch safety classes: ${error.message}`);
    }

    console.log(`✅ Fetched ${safetyClasses?.length || 0} safety classes`);
    return safetyClasses || [];
  } catch (error) {
    console.error("Unexpected error in getSafetyClasses:", error);
    return [];
  }
});

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
  const type = String(formData.get("type") || "Safety Class").trim();
  const mode = String(formData.get("mode") || "Remote").trim();
  console.log(formData);
  if (!title || !description || !videoUrl || duration <= 0) {
    throw new Error("Please fill in all required fields");
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error } = await admin.from("safety_classes").insert({
    firm_id: firmId ?? null, // Allow null
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

export default async function SafetyClassesPage({
  searchParams,
}: {
  searchParams: { category?: string; type?: string };
}) {
  const startTime = Date.now();
  console.log('🚀 SafetyClassesPage: Starting render');
  
  try {
    // Run auth check
    const me = await requireAdmin();
    
    const category = searchParams?.category ?? "all";
    const type = searchParams?.type ?? "remote";
    
    console.log('👤 Auth check completed:', { role: me.role, firmId: me.firmId });
    
    // Fetch safety classes with timeout to prevent hanging
    const safetyClassesPromise = Promise.race([
      getSafetyClasses({ firmId: me.firmId }),
      // 10 second timeout
      new Promise<SafetyClass[]>((_, reject) => 
        setTimeout(() => reject(new Error('Data fetch timeout')), 10000)
      )
    ]);
    
    const safetyClasses = await safetyClassesPromise;
    
    const endTime = Date.now();
    console.log(`⚡ SafetyClassesPage: Completed in ${endTime - startTime}ms with ${safetyClasses.length} classes`);

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
  } catch (error) {
    console.error('❌ SafetyClassesPage: Error:', error);
    
    // Return a fallback UI on error without event handlers
    return (
      <div className="container mx-auto p-6">
        {/* <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Unable to load safety classes</h2>
          <p className="text-red-600">
            We're experiencing technical difficulties. Please refresh the page manually.
          </p>
        </div> */}
      </div>
    );
  }
}
