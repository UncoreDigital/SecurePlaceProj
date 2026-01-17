"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { databases } from "@/lib/appwrite-server";
import { Query, Models } from "appwrite";
import StatCard from "../components/StatCard";
import CircularGraph from "../components/CircularGraph";
import { Users, UserCheck, Siren } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MonthlyEmergenciesChart from "../components/MonthlyEmergenciesChart";
import SafetyClassesTable from "../components/SafetyClassesTable";
import { createBrowserSupabase } from "@/lib/supabase/browser";

// Use the singleton browser client
const supabase = createBrowserSupabase();


// Define the colors for our charts
const COLORS = ["#001D49", "#FF5F15", "#F1F5F9", "#64748B"]; // Brand Blue, Orange, Slates

// Add an interface for the safety training document
interface SafetyTraining extends Models.Document {
  status: string;
  type: string;
}

interface ChartDataPoint {
  name: string;
  value: number;
}

// NEW: Define a type for the chart state object
interface ChartState {
  drills: ChartDataPoint[];
  workshops: ChartDataPoint[];
  compliance: ChartDataPoint[];
}

const FirmAdminDashboardPage = () => {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState({
    employees: 0,
    volunteers: 0,
    emergencies: 0,
  });
  const [chartData, setChartData] = useState<ChartState>({
    drills: [],
    workshops: [],
    compliance: [],
  });
  const [safetyClasses, setSafetyClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // --- Fetch Stat Card Data ---
        const employeeRes = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "employee")
          .eq("firm_id", user?.firmId);

        const volunteerRes = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "employee")
          .eq("firm_id", user?.firmId)
          .eq("is_volunteer", true);

        const emergencyRes = { count: 0 };
        // await supabase
        //   .from("incidents")
        //   .select("*", { count: "exact", head: true }).eq("firm_id", user?.firmId);;

        // --- Fetch Chart Data ---
        const completedDrillsRes: any = { count: 0 };
          // await supabase
          // .from("drills")
          // .select("*", { count: "exact", head: true })
          // .eq("status", "completed").eq("firm_id", user?.firmId);;

        const pendingDrillsRes: any = { count: 0 };
        // await supabase
        //   .from("drills")
        //   .select("*", { count: "exact", head: true })
        //   .eq("status", "pending").eq("firm_id", user?.firmId);;

        // Fetch all safety training documents
        const workshopsRes: any = { count: 0 };
        //  await supabase
        //   .from("trainings")
        //   .select("*").eq("firm_id", user?.firmId);;

        // --- Fetch Safety Classes Data ---
        let classesQuery = supabase
          .from("scheduled_classes")
          .select(`
            *, 
            safety_class: safety_class_id(title, id, type, duration_minutes, mode), 
            firms:firm_id ( name ), 
            locations:location_id ( id, name )
          `)
          .order("start_time", { ascending: false });
        // Filter by firm_id for firm admins
        if (user?.role === "firm_admin" && user?.firmId) {
          classesQuery = classesQuery.eq("firm_id", user.firmId);
        }

        const { data: classesData, error: classesError } = await classesQuery;
        
        if (classesError) {
          console.error("Error fetching safety classes:", classesError);
        } else {
          setSafetyClasses(classesData || []);
        }

        // Set state for stat cards
        setStats({
          employees: employeeRes.count ?? 0,
          volunteers: volunteerRes.count ?? 0,
          emergencies: emergencyRes.count ?? 0,
        });

        // Process workshop data to group by type
        const workshopTypes: { [key: string]: number } = {};
        (workshopsRes?.data ?? []).forEach((doc: SafetyTraining) => {
          workshopTypes[doc.type] = (workshopTypes[doc.type] || 0) + 1;
        });
        const processedWorkshops = Object.entries(workshopTypes).map(
          ([name, value]) => ({ name, value })
        );

        // Process and set state for charts
        setChartData({
          drills: [
            { name: "Completed", value: completedDrillsRes.count ?? 0 },
            { name: "Pending", value: pendingDrillsRes.count ?? 0 },
          ],
          workshops: processedWorkshops,
          compliance: [
            {
              name: "Workshops Done",
              value: (workshopsRes.data ?? []).filter(
                (d: SafetyTraining) => d.status === "completed"
              ).length,
            },
            { name: "Drills Done", value: completedDrillsRes.count ?? 0 },
          ],
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading && user) {
      fetchDashboardData();
    } else {
      // If user is not loading but also not available, still set loading to false
      if (!userLoading && !user) {
        setLoading(false);
      }
    }
  }, [userLoading, user]);

  // The loading skeleton JSX remains the same
  if (loading) {
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

  // The main return JSX with the updated chart title
  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-blue mb-6">
        Welcome, {user?.fullName}!
      </h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Employees"
          value={stats.employees}
          icon={Users}
          href="/employees"
          change="+15"
          changeType="positive"
        />
        <StatCard
          title="Total Volunteers"
          value={stats.volunteers}
          icon={UserCheck}
          href="#"
          change="+2"
          changeType="positive"
        />
        <StatCard
          title="Total Emergencies"
          value={stats.emergencies}
          icon={Siren}
          href="/dashboard/emergencies"
          change="-1"
          changeType="negative"
        />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <CircularGraph
          title="Drill Alerts Status"
          data={chartData.drills}
          colors={COLORS}
        />
        <CircularGraph
          title="Workshop Types"
          data={chartData.workshops}
          colors={COLORS}
        />
        <CircularGraph
          title="Compliance Overview"
          data={chartData.compliance}
          colors={COLORS}
        />
      </div>

      <div className="mt-8 grid gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <MonthlyEmergenciesChart />
        </div>
        <div className="lg:col-span-3">
          <SafetyClassesTable data={safetyClasses} />
        </div>
      </div>
    </div>
  );
};

export default FirmAdminDashboardPage;
