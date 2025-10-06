import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
// // import SafetyClassesClient from "./SafetyClasses.client";
import { revalidatePath } from "next/cache";
// import { SafetyClass } from "./types";
import { cache } from "react";
import ScheduledClassesClient from "./ScheduledClasses.client";
import { useUser } from "@/hooks/useUser";

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
const getScheduledClasses = cache(async ({
  firmId,
}: {
  firmId?: string | null;
}): Promise<any[]> => {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  }: any = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("profiles")
    .select("firm_id, full_name, role")
    .eq("id", user.id)
    .single();
  console.log('👤 Current user role:', me);
  try {
    // Optimized query with specific columns and better indexing
    // .select("*, safety_class: safety_class_id(title, thumbnail_url, video_url)")
    let query = supabase
      .from("scheduled_classes")
      .select("*, safety_class: safety_class_id(title), firms:firm_id ( name )")
      .order("start_time", { ascending: false }); // Add reasonable limit to prevent large data loads

    let { data: scheduledClasses, error }: any = await query;

    // Format data for UI
    scheduledClasses = user?.firm_id ? scheduledClasses?.filter((cls: any) => cls?.firm_id === user?.firm_id) : scheduledClasses;
    const formatted = (scheduledClasses || []).map((cls: any) => ({
      id: cls.id,
        title: cls.safety_class?.title ?? "Untitled",
        date: cls.start_time
          ? new Date(cls.start_time).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          : "",
        time:
          cls.start_time && cls.end_time
            ? `${new Date(cls.start_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })} to ${new Date(cls.end_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}`
            : "",
        status: cls.status ?? "pending",
        type: cls.type ?? "In-Person",
        thumbnailUrl: cls.safety_class?.thumbnail_url ?? "/images/safety-class-demo.png",
        firm: cls.firms?.name || "-",
        currentUserRole: me?.role || "employee",
      }));
      scheduledClasses = formatted
    if (error) {
      console.error("Error fetching Scheduled classes:", error);
      throw new Error(`Failed to fetch Scheduled classes: ${error.message}`);
    }

    console.log(`✅ Fetched ${scheduledClasses?.length || 0} Scheduled classes`);
    return scheduledClasses || [];
  } catch (error) {
    console.error("Unexpected error in getScheduledClasses:", error);
    return [];
  }
});

// Server action to create a new safety class
// export async function createSafetyClass(formData: FormData) {
//   "use server";
//   const me = await requireAdmin();

//   // For super admins, firmId can be null
//   const firmId = me.firmId;

//   const title = String(formData.get("title") || "").trim();
//   const description = String(formData.get("description") || "").trim();
//   const videoUrl = String(formData.get("videoUrl") || "").trim();
//   const duration = parseInt(String(formData.get("duration") || "0"));
//   const isRequired = String(formData.get("isRequired") || "") === "on";
//   const thumbnailUrl = String(formData.get("thumbnailUrl") || "").trim();

//   if (!title || !description || !videoUrl || duration <= 0) {
//     throw new Error("Please fill in all required fields");
//   }

//   const admin = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     { auth: { autoRefreshToken: false, persistSession: false } }
//   );
//   console.log({ thumbnailUrl });
//   const { error } = await admin.from("safety_classes").insert({
//     firm_id: firmId ?? null, // Allow null
//     title,
//     description,
//     video_url: videoUrl,
//     duration_minutes: duration,
//     is_required: isRequired,
//     thumbnail_url: thumbnailUrl || null,
//   });

//   if (error) {
//     console.error("Error creating safety class:", error);
//     throw new Error("Failed to create safety class");
//   }

//   revalidatePath("/safety-classes");
// }

export default async function ScheduledClassesPage({
  searchParams,
}: {
  searchParams: { category?: string; type?: string };
}) {
  const startTime = Date.now();
  console.log('🚀 ScheduledClassesPage: Starting render');

  try {
    // Run auth check
    const me = await requireAdmin();

    const category = searchParams?.category ?? "all";
    const type = searchParams?.type ?? "in-person";

    console.log('👤 Auth check completed:', { role: me.role, firmId: me.firmId });

    // Fetch scheduled classes with timeout to prevent hanging
    const scheduledClassesPromise = Promise.race([
      getScheduledClasses({ firmId: me.firmId }),
      // 10 second timeout
      new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error('Data fetch timeout')), 10000)
      )
    ]);

    const scheduledClasses = await scheduledClassesPromise;

    const endTime = Date.now();
    console.log(`⚡ ScheduledClassesPage: Completed in ${endTime - startTime}ms with ${scheduledClasses.length} classes`);

    return (
      <div className="container mx-auto">
        <ScheduledClassesClient
          scheduledClasses={scheduledClasses}
          initialCategory={category}
          initialType={type}
          isSuperAdmin={me.role === "super_admin"}
        />
      </div>
    );
  } catch (error) {
    console.error('❌ ScheduledClassesPage: Error:', error);

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
