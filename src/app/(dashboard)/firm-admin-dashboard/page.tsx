import { Suspense } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";
import FirmAdminDashboardClient from "./FirmAdminDashboard.client";

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ChartState {
  drills: ChartDataPoint[];
  workshops: ChartDataPoint[];
  compliance: ChartDataPoint[];
}

interface DashboardStats {
  employees: number;
  volunteers: number;
  emergencies: number;
}

interface DashboardData {
  stats: DashboardStats;
  chartData: ChartState;
  safetyClasses: any[];
  userFullName: string;
}

async function getDashboardData(userFirmId: string): Promise<DashboardData> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // --- Fetch Stat Card Data ---
    const employeeRes = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "employee")
      .eq("firm_id", userFirmId);

    const volunteerRes = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "employee")
      .eq("firm_id", userFirmId)
      .eq("is_volunteer", true);

    const emergencyRes = { count: 0 };
    // await supabase
    //   .from("incidents")
    //   .select("*", { count: "exact", head: true }).eq("firm_id", userFirmId);

    // --- Fetch Chart Data ---
    const completedDrillsRes: any = { count: 0 };
    // await supabase
    // .from("drills")
    // .select("*", { count: "exact", head: true })
    // .eq("status", "completed").eq("firm_id", userFirmId);

    const pendingDrillsRes: any = { count: 0 };
    // await supabase
    //   .from("drills")
    //   .select("*", { count: "exact", head: true })
    //   .eq("status", "pending").eq("firm_id", userFirmId);

    // Fetch all safety training documents
    const workshopsRes: any = { count: 0 };
    //  await supabase
    //   .from("trainings")
    //   .select("*").eq("firm_id", userFirmId);

    // --- Fetch Safety Classes Data ---
    const { data: classesData, error: classesError } = await supabase
      .from("scheduled_classes")
      .select(`
        *, 
        safety_class: safety_class_id(title, id, type, duration_minutes, mode), 
        firms:firm_id ( name ), 
        locations:location_id ( id, name )
      `)
      .eq("firm_id", userFirmId)
      .order("start_time", { ascending: false });

    if (classesError) {
      console.error("Error fetching safety classes:", classesError);
    }

    // Process workshop data to group by type
    const workshopTypes: { [key: string]: number } = {};
    (workshopsRes?.data ?? []).forEach((doc: any) => {
      workshopTypes[doc.type] = (workshopTypes[doc.type] || 0) + 1;
    });
    const processedWorkshops = Object.entries(workshopTypes).map(
      ([name, value]) => ({ name, value })
    );

    return {
      stats: {
        employees: employeeRes.count ?? 0,
        volunteers: volunteerRes.count ?? 0,
        emergencies: emergencyRes.count ?? 0,
      },
      chartData: {
        drills: [
          { name: "Completed", value: completedDrillsRes.count ?? 0 },
          { name: "Pending", value: pendingDrillsRes.count ?? 0 },
        ],
        workshops: processedWorkshops,
        compliance: [
          {
            name: "Workshops Done",
            value: (workshopsRes.data ?? []).filter(
              (d: any) => d.status === "completed"
            ).length,
          },
          { name: "Drills Done", value: completedDrillsRes.count ?? 0 },
        ],
      },
      safetyClasses: classesData || [],
      userFullName: "", // Will be set from user profile
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return {
      stats: { employees: 0, volunteers: 0, emergencies: 0 },
      chartData: { drills: [], workshops: [], compliance: [] },
      safetyClasses: [],
      userFullName: "",
    };
  }
}

function LoadingSpinner() {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </>
  );
}

async function FirmAdminDashboardContent() {
  // Get current user context server-side (same pattern as employees page)
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userRole = "employee";
  let userFirmId = null;
  let userFullName = "";
  let dashboardData: DashboardData | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, firm_id, first_name, last_name")
      .eq("id", user.id)
      .single();
    
    if (profile) {
      userRole = profile.role;
      userFirmId = profile.firm_id;
      userFullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email || 'User';
      
      // Fetch dashboard data if user has a firm
      if (userFirmId) {
        dashboardData = await getDashboardData(userFirmId);
        dashboardData.userFullName = userFullName;
      }
    }
  }

  // Handle different states
  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold text-brand-blue mb-6">Dashboard</h1>
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">User not found</p>
          <p className="text-sm text-gray-500">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (!userFirmId) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold text-brand-blue mb-6">Dashboard</h1>
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">No firm associated</p>
          <p className="text-sm text-gray-500">Your account is not associated with any firm.</p>
          <p className="text-xs text-gray-400 mt-2">
            Debug: userId={user.id}, role={userRole}
          </p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold text-brand-blue mb-6">Dashboard</h1>
        <div className="text-center py-12">
          <p className="text-lg text-gray-600">Failed to load dashboard data</p>
          <p className="text-sm text-gray-500">Please try refreshing the page.</p>
          <p className="text-xs text-gray-400 mt-2">
            Debug: firmId={userFirmId}, userId={user.id}
          </p>
        </div>
      </div>
    );
  }

  return (
    <FirmAdminDashboardClient 
      initialDashboardData={dashboardData}
    />
  );
}

export default async function FirmAdminDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FirmAdminDashboardContent />
    </Suspense>
  );
}