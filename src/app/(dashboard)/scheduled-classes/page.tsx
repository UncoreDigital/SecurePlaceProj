import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import ScheduledClassesClient from "./ScheduledClasses.client";
import { Suspense } from "react";
import { AdminGuard } from "@/components/AuthGuard";

// Use ISR with a reasonable revalidation time for better performance
export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

// Get scheduled classes function
async function getScheduledClasses(): Promise<any[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // created_by is linked to auth.users.id
    let query = supabase
      .from("scheduled_classes")
      .select(`
        *, 
        safety_class: safety_class_id(title, id), 
        firms:firm_id ( name ), 
        locations:location_id ( id, name )
      `)
      .order("start_time", { ascending: false });

    let { data: scheduledClasses, error }: any = await query;
    
    console.log(scheduledClasses, `✅ Fetched Scheduled classes`);
    
    // Fetch creator details from auth.users for each scheduled class
    let classesWithCreators = scheduledClasses;
    if (scheduledClasses && scheduledClasses.length > 0) {
      // Get unique creator IDs
      const creatorIds = [...new Set(
        scheduledClasses
          .map((cls: any) => cls.created_by)
          .filter((id: any) => id !== null && id !== undefined)
      )];
      
      if (creatorIds.length > 0) {
        try {
            const { data: userProfiles, error: userProfileError } = await supabase
              .from("user_profiles")
              .select("id, first_name, last_name, official_email, role, phone, created_at")
              .in("id", creatorIds);
            
            console.log('🔍 User profiles result:', { userProfiles, userProfileError });
            
            if (!userProfileError && userProfiles && userProfiles.length > 0) {
              // Format user_profiles data to match expected structure
              const formattedCreators = userProfiles.map(profile => ({
                id: profile.id,
                full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
                official_email: profile.official_email,
                role: profile.role,
                phone: profile.phone,
                created_at: profile.created_at
              }));
              
              const creatorMap = new Map(formattedCreators.map(creator => [creator.id, creator]));
              
              classesWithCreators = scheduledClasses.map((cls: any) => ({
                ...cls,
                creator: cls.created_by ? creatorMap.get(cls.created_by) : null
              }));
              
              console.log(`✅ Fetched creator details from user_profiles for ${formattedCreators.length} users`);
            }
 
        } catch (creatorFetchError) {
          console.error("❌ Error fetching creator details:", creatorFetchError);
        }
      }
    }
    
    const formatted = (classesWithCreators || []).map((cls: any) => ({
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
      firmId: cls?.firm_id || "",
      location: cls.locations?.name || "Remote",
      locationId: cls.locations?.id || null,
      created_at: cls.start_time
        ? new Date(cls.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        : "",
      // Creator info - fetched from profiles table linked to auth.users
      createdBy: cls.creator?.full_name || cls.creator?.official_email || "System",
      createdById: cls.creator?.id || cls.created_by || null,
      creatorDetails: cls.creator ? {
        id: cls.creator.id,
        fullName: cls.creator.full_name,
        email: cls.creator.official_email,
        role: cls.creator.role,
        phone: cls.creator.phone,
        createdAt: cls.creator.created_at
      } : null,
      currentUserRole: cls.creator ? cls.creator.role : "", // Will be controlled by AdminGuard
      safetyClassId: cls?.safety_class?.id || null,
    }));
    if (error) {
      console.error("Error fetching Scheduled classes:", error);
      throw new Error(`Failed to fetch Scheduled classes: ${error.message}`);
    }

    return formatted || [];
  } catch (error: any) {
    console.error("Unexpected error in getScheduledClasses:", error);
    return [];
  }
}

// Server action to update scheduled class status
export async function updateScheduledClassStatus(scheduledClassId: string, newStatus: string) {
  "use server";

  try {
    // Use service role key to bypass RLS for admin operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validate status
    const validStatuses = ['approved', 'pending'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Update the status
    const { error: updateError } = await admin
      .from("scheduled_classes")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", scheduledClassId);

    if (updateError) {
      console.error("Error updating scheduled class status:", updateError);
      throw new Error("Failed to update scheduled class status");
    }

    console.log('✅ Successfully updated scheduled class status:', scheduledClassId, 'to', newStatus);

    // Revalidate the page to show updated data
    revalidatePath("/scheduled-classes");

    return { success: true };
  } catch (error) {
    console.error("Server action error:", error);
    throw error;
  }
}

// Server action to approve a scheduled class
export async function approveScheduledClass(scheduledClassId: string) {
  "use server";

  try {
    // Use service role key to bypass RLS for admin operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('🔄 Approving scheduled class:', { scheduledClassId });

    // Update the scheduled class status to approved
    const { error } = await admin
      .from("scheduled_classes")
      .update({ status: "approved" })
      .eq("id", scheduledClassId);

    // Update the status to approved
    const { error: updateError } = await admin
      .from("scheduled_classes")
      .update({
        status: "approved",
        updated_at: new Date().toISOString()
      })
    if (error) {
      console.error("Error updating scheduled class:", error);
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
    // Use service role key to bypass RLS for admin operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log('🔄 cancel scheduled class:', { scheduledClassId });

    // Update the status to cancelled
    const { error: updateError } = await admin
      .from("scheduled_classes")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
      .eq("id", scheduledClassId);

    if (updateError) {
      console.error("Error updating scheduled class:", updateError);
      throw new Error("Failed to cancel scheduled class");
    }

    console.log('✅ Successfully cancelled scheduled class:', scheduledClassId);

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
        <img src="/loadingImg.svg" alt="Loading..." className="h-16 w-16" />
        <p className="mt-2 text-gray-600 text-lg">Loading Scheduled Classes...</p>
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
    const category = searchParams?.category ?? "all";
    const type = searchParams?.type ?? "in-person";

    console.log('👤 Auth check completed via AdminGuard');

    // Fetch scheduled classes
    const scheduledClasses = await getScheduledClasses();

    const endTime = Date.now();
    console.log(`⚡ ScheduledClassesPage: Completed in ${endTime - startTime}ms with ${scheduledClasses.length} classes`);

    return (
      <div className="container mx-auto">
        <ScheduledClassesClient
          scheduledClasses={scheduledClasses}
          initialCategory={category}
          initialType={type}
          isSuperAdmin={true} // Will be controlled by AdminGuard
          approveScheduledClass={approveScheduledClass}
          cancelScheduledClass={cancelScheduledClass}
          updateScheduledClassStatus={updateScheduledClassStatus}
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
    <AdminGuard requiredRole={["super_admin", "firm_admin"]}>
      <Suspense fallback={<LoadingSpinner />}>
        <ScheduledClassesContent searchParams={searchParams} />
      </Suspense>
    </AdminGuard>
  );
}
