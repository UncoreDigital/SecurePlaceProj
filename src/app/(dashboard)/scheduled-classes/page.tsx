import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import ScheduledClassesClient from "./ScheduledClasses.client";
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

// Get scheduled classes function
async function getScheduledClasses({
  firmId,
}: {
  firmId?: string | null;
}): Promise<any[]> {
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
      .select("*, safety_class: safety_class_id(title, id), firms:firm_id ( name )")
      .order("start_time", { ascending: false }); // Add reasonable limit to prevent large data loads

    let { data: scheduledClasses, error }: any = await query;
    // Format data for UI
    scheduledClasses = me?.firm_id ? scheduledClasses?.filter((cls: any) => cls?.firm_id === me?.firm_id) : scheduledClasses;
    console.log(scheduledClasses, `✅ Fetched Scheduled classes`);
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
      safetyClassId: cls?.safety_class?.id || null,
    }));
    scheduledClasses = formatted
    if (error) {
      console.error("Error fetching Scheduled classes:", error);
      throw new Error(`Failed to fetch Scheduled classes: ${error.message}`);
    }

    return scheduledClasses || [];
  } catch (error) {
    console.error("Unexpected error in getScheduledClasses:", error);
    return [];
  }
}

// Server action to approve a scheduled class
export async function approveScheduledClass(scheduledClassId: string) {
  "use server";

  try {
    const me = await requireAdmin();

    // Use service role key to bypass RLS for admin operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('🔄 Approving scheduled class:', { scheduledClassId, adminRole: me.role, firmId: me.firmId });

    // First, check if the scheduled class exists and get its details
    const { data: scheduledClass, error: fetchError } = await admin
      .from("scheduled_classes")
      .select("*, safety_classes!inner(firm_id)")
      .eq("id", scheduledClassId)
      .single();

    if (fetchError) {
      console.error("Error fetching scheduled class:", fetchError);
      throw new Error("Scheduled class not found");
    }

    // Check permissions - super admins can approve all, firm admins only their firm's classes
    if (me.role === "firm_admin") {
      const safetyClassFirmId = scheduledClass.safety_classes?.firm_id;
      if (safetyClassFirmId !== me.firmId) {
        throw new Error("You can only approve classes for your firm");
      }
    }

    // Update the status to approved
    const { error: updateError } = await admin
      .from("scheduled_classes")
      .update({
        status: "approved",
        updated_at: new Date().toISOString()
      })
      .eq("id", scheduledClassId);

    if (updateError) {
      console.error("Error updating scheduled class:", updateError);
      throw new Error("Failed to approve scheduled class");
    }

    console.log('✅ Successfully approved scheduled class:', scheduledClassId);

    // Revalidate the page to show updated data
    revalidatePath("/scheduled-classes");

    return { success: true };
  } catch (error) {
    console.error("Server action error:", error);
    throw error;
  }
}

// Server action to cancel a scheduled class
export async function cancelScheduledClass(scheduledClassId: string) {
  "use server";

  try {
    const me = await requireAdmin();

    // Use service role key to bypass RLS for admin operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('🔄 cancel scheduled class:', { scheduledClassId, adminRole: me.role, firmId: me.firmId });

    // First, check if the scheduled class exists and get its details
    // const { data: scheduledClass, error: fetchError } = await admin
    //   .from("scheduled_classes")
    //   .select("*, safety_classes!inner(firm_id)")
    //   .eq("id", scheduledClassId)
    //   .single();

    // if (fetchError) {
    //   console.error("Error fetching scheduled class:", fetchError);
    //   throw new Error("Scheduled class not found");
    // }

    // // Check permissions - super admins can approve all, firm admins only their firm's classes
    // if (me.role === "firm_admin") {
    //   const safetyClassFirmId = scheduledClass.safety_classes?.firm_id;
    //   if (safetyClassFirmId !== me.firmId) {
    //     throw new Error("You can only approve classes for your firm");
    //   }
    // }

    // Update the status to approved
    const { error: updateError } = await admin
      .from("scheduled_classes")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("id", scheduledClassId);

    if (updateError) {
      console.error("Error updating scheduled class:", updateError);
      throw new Error("Failed to approve scheduled class");
    }

    console.log('✅ Successfully approved scheduled class:', scheduledClassId);

    // Revalidate the page to show updated data
    revalidatePath("/scheduled-classes");

    return { success: true };
  } catch (error) {
    console.error("Server action error:", error);
    throw error;
  }
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 text-lg">Loading Scheduled Classes...</p>
      </div>
    </div>
  );
}

// Main component that loads data
async function ScheduledClassesContent({
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

    // Fetch scheduled classes
    const scheduledClasses = await getScheduledClasses({ firmId: me.firmId });

    const endTime = Date.now();
    console.log(`⚡ ScheduledClassesPage: Completed in ${endTime - startTime}ms with ${scheduledClasses.length} classes`);

    return (
      <div className="container mx-auto">
        <ScheduledClassesClient
          scheduledClasses={scheduledClasses}
          initialCategory={category}
          initialType={type}
          isSuperAdmin={me.role === "super_admin"}
          approveScheduledClass={approveScheduledClass}
          cancelScheduledClass={cancelScheduledClass}
        />
      </div>
    );
  } catch (error) {
    console.error('❌ ScheduledClassesPage: Error:', error);

    // Return a fallback UI on error
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Unable to load scheduled classes</h2>
          <p className="text-red-600">
            We're experiencing technical difficulties. Please refresh the page to try again.
          </p>
        </div>
      </div>
    );
  }
}

export default function ScheduledClassesPage({
  searchParams,
}: {
  searchParams: { category?: string; type?: string };
}) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ScheduledClassesContent searchParams={searchParams} />
    </Suspense>
  );
}
