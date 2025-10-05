import { databases } from "@/lib/appwrite-server"; // <-- Use the server client
import { Query, Models } from "appwrite";
import { DashboardUI } from "./DashboardUI";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define interfaces for our data structures
interface SafetyTraining extends Models.Document {
  type: string;
  status: string;
}

// This function now runs securely on the server
async function getDashboardData() {
  try {
    // Fetch all data concurrently
    const [
      employeeRes,
      volunteerRes,
      emergencyRes,
      completedDrillsRes,
      pendingDrillsRes,
      workshopsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "employee").eq("is_volunteer", true),
      Promise.resolve({ count: 0 }), // Static value for incidents
      supabase.from("drills").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("drills").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("scheduled_classes").select("status").in("status", ["approved", "pending"]), // Get actual data for processing
    ]);
    // console.log("Workshops Data:", workshopsRes);
    // console.log("Test Data:", workshopsRes);
    // Process chart data
    const workshopTypes: { [key: string]: number } = {};
    (workshopsRes.data ?? []).forEach((doc: { status: string }) => {
      workshopTypes[doc.status] = (workshopTypes[doc.status] || 0) + 1;
    });
    const processedWorkshops = Object.entries(workshopTypes).map(
      ([name, value]) => ({ name, value })
    );

    // Return all processed data
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
              (d: { status: string }) => d.status === "approved" || d.status === "completed"
            ).length,
          },
          { name: "Drills Done", value: completedDrillsRes.count ?? 0 },
        ],
      },
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // Return empty data on error
    return {
      stats: { employees: 0, volunteers: 0, emergencies: 0 },
      chartData: { drills: [], workshops: [], compliance: [] },
    };
  }

  // try {
  //   const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  //   const usersCollectionId =
  //     process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
  //   const drillsCollectionId =
  //     process.env.NEXT_PUBLIC_APPWRITE_DRILLS_COLLECTION_ID!;
  //   const trainingsCollectionId =
  //     process.env.NEXT_PUBLIC_APPWRITE_TRAININGS_COLLECTION_ID!;
  //   const incidentsCollectionId =
  //     process.env.NEXT_PUBLIC_APPWRITE_INCIDENTS_COLLECTION_ID!;

  //   // Fetch all data concurrently
  //   const [
  //     employeeData,
  //     volunteerData,
  //     emergencyData,
  //     completedDrills,
  //     pendingDrills,
  //     workshopsData,
  //   ] = await Promise.all([
  //     databases.listDocuments(databaseId, usersCollectionId),
  //     databases.listDocuments(databaseId, usersCollectionId, [
  //       Query.equal("isVolunteer", true),
  //     ]),
  //     databases.listDocuments(databaseId, incidentsCollectionId),
  //     databases.listDocuments(databaseId, drillsCollectionId, [
  //       Query.equal("status", "completed"),
  //     ]),
  //     databases.listDocuments(databaseId, drillsCollectionId, [
  //       Query.equal("status", "pending"),
  //     ]),
  //     databases.listDocuments<SafetyTraining>(
  //       databaseId,
  //       trainingsCollectionId
  //     ),
  //   ]);

  //   // Process chart data
  //   const workshopTypes: { [key: string]: number } = {};
  //   workshopsData.documents.forEach((doc) => {
  //     workshopTypes[doc.type] = (workshopTypes[doc.type] || 0) + 1;
  //   });
  //   const processedWorkshops = Object.entries(workshopTypes).map(
  //     ([name, value]) => ({ name, value })
  //   );

  //   // Return all processed data
  //   return {
  //     stats: {
  //       employees: employeeData.total,
  //       volunteers: volunteerData.total,
  //       emergencies: emergencyData.total,
  //     },
  //     chartData: {
  //       drills: [
  //         { name: "Completed", value: completedDrills.total },
  //         { name: "Pending", value: pendingDrills.total },
  //       ],
  //       workshops: processedWorkshops,
  //       compliance: [
  //         {
  //           name: "Workshops Done",
  //           value: workshopsData.documents.filter(
  //             (d) => d.status === "completed"
  //           ).length,
  //         },
  //         { name: "Drills Done", value: completedDrills.total },
  //       ],
  //     },
  //   };
  // } catch (error) {
  //   console.error("Failed to fetch dashboard data:", error);
  //   // Return empty data on error
  //   return {
  //     stats: { employees: 0, volunteers: 0, emergencies: 0 },
  //     chartData: { drills: [], workshops: [], compliance: [] },
  //   };
  // }
}

// The page is now an async Server Component
export default async function SuperAdminDashboardPage() {
  const { stats, chartData } = await getDashboardData();

  // Note: We can't use the useUser hook on the server.
  // The user's name would be fetched differently, but we'll use a placeholder for now.
  const userName = "Super Admin";

  return (
    <DashboardUI stats={stats} chartData={chartData} userName={userName} />
  );
}
