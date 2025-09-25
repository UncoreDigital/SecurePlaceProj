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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
        const usersCollectionId =
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
        const drillsCollectionId =
          process.env.NEXT_PUBLIC_APPWRITE_DRILLS_COLLECTION_ID!;
        const trainingsCollectionId =
          process.env.NEXT_PUBLIC_APPWRITE_TRAININGS_COLLECTION_ID!;
        const incidentsCollectionId =
          process.env.NEXT_PUBLIC_APPWRITE_INCIDENTS_COLLECTION_ID!;

        // --- Fetch Stat Card Data ---
        const employeePromise = databases.listDocuments(
          databaseId,
          usersCollectionId
        );
        const volunteerPromise = databases.listDocuments(
          databaseId,
          usersCollectionId,
          [Query.equal("isVolunteer", true)]
        );
        const emergenciesPromise = databases.listDocuments(
          databaseId,
          incidentsCollectionId
        );

        // --- Fetch Chart Data ---
        const completedDrillsPromise = databases.listDocuments(
          databaseId,
          drillsCollectionId,
          [Query.equal("status", "completed")]
        );
        const pendingDrillsPromise = databases.listDocuments(
          databaseId,
          drillsCollectionId,
          [Query.equal("status", "pending")]
        );

        // UPDATED: Fetch all safety training documents to process them
        const workshopsPromise = databases.listDocuments<SafetyTraining>(
          databaseId,
          trainingsCollectionId
        );

        const [
          employeeData,
          volunteerData,
          emergencyData,
          completedDrills,
          pendingDrills,
          workshopsData,
        ] = await Promise.all([
          employeePromise,
          volunteerPromise,
          emergenciesPromise,
          completedDrillsPromise,
          pendingDrillsPromise,
          workshopsPromise,
        ]);

        // Set state for stat cards
        setStats({
          employees: employeeData.total,
          volunteers: volunteerData.total,
          emergencies: emergencyData.total,
        });

        // --- NEW: Process workshop data to group by type ---
        const workshopTypes: { [key: string]: number } = {};
        workshopsData.documents.forEach((doc) => {
          workshopTypes[doc.type] = (workshopTypes[doc.type] || 0) + 1;
        });
        const processedWorkshops = Object.entries(workshopTypes).map(
          ([name, value]) => ({ name, value })
        );
        // --- End of new processing logic ---

        // Process and set state for charts
        setChartData({
          drills: [
            { name: "Completed", value: completedDrills.total },
            { name: "Pending", value: pendingDrills.total },
          ],
          workshops: processedWorkshops, // Use the new processed data
          compliance: [
            {
              name: "Workshops Done",
              value: workshopsData.documents.filter(
                (d) => d.status === "completed"
              ).length,
            },
            { name: "Drills Done", value: completedDrills.total },
          ],
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading) {
      fetchDashboardData();
    }
  }, [userLoading]);

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
          href="/dashboard/employees"
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
          <SafetyClassesTable />
        </div>
      </div>
    </div>
  );
};

export default FirmAdminDashboardPage;
