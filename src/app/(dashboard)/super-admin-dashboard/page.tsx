import { Query, Models } from "appwrite";
import { DashboardUI } from "./DashboardUI";
import { createServerSupabase } from "@/lib/supabase/server";

// Define interfaces for our data structures
interface SafetyTraining extends Models.Document {
  type: string;
  status: string;
}

// This function now runs securely on the server
async function getDashboardData() {
  const supabase = await createServerSupabase();
  try {
    // Fetch all data concurrently
    const [
      employeeRes,
      volunteerRes,
      emergencyRes,
      completedDrillsRes,
      pendingDrillsRes,
      workshopsRes,
      locationsRes,
      safetyClassesRes
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "employee").eq("is_volunteer", true),
      Promise.resolve({ count: 0 }), // Static value for incidents
      supabase.from("drills").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("drills").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("scheduled_classes").select("status").in("status", ["approved", "pending"]), // Get actual data for processing
      supabase.from('locations').select('*', { count: 'exact', head: true }),
      supabase.from("scheduled_classes")
      .select(`
        *, 
        safety_class: safety_class_id(title, id, type, mode), 
        firms:firm_id ( name )
      `)
      .order("start_time", { ascending: false })
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
    const drillTotal = 2;
    const drillDone = completedDrillsRes.count ?? 0;
    const workshopTotal = 4;
    const workshopDone = workshopTypes.length ?? 0;
    const complianceTotal = 2;
    const complianceDone = drillDone;

    return {
      stats: {
        employees: employeeRes.count ?? 0,
        volunteers: volunteerRes.count ?? 0,
        emergencies: emergencyRes.count ?? 0,
        locations: locationsRes.count ?? 0,
      },
      chartData: {
        drills: {
          data: drillDone > drillTotal 
            ? [{ name: "Done", value: drillDone }]
            : [
                { name: "Done", value: drillDone },
                { name: "Pending", value: drillTotal - drillDone },
              ],
          totalValue: drillTotal,
          doneValue: drillDone,
        },
        workshops: {
          data: workshopDone > workshopTotal
            ? [{ name: "Done", value: workshopDone }]
            : [
                { name: "Done", value: workshopDone },
                { name: "Pending", value: workshopTotal - workshopDone },
              ],
          totalValue: workshopTotal,
          doneValue: workshopDone,
        },
        compliance: {
          data: complianceDone > complianceTotal
            ? [{ name: "Done", value: complianceDone }]
            : [
                { name: "Done", value: complianceDone },
                { name: "Pending", value: complianceTotal - complianceDone },
              ],
          totalValue: complianceTotal,
          doneValue: complianceDone,
        },
      },
      safetyClasses: safetyClassesRes.data ?? [],
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // Return empty data on error
    return {
      stats: { employees: 0, volunteers: 0, emergencies: 0, locations: 0 },
      chartData: {
        drills: { data: [], totalValue: 0, doneValue: 0 },
        workshops: { data: [], totalValue: 0, doneValue: 0 },
        compliance: { data: [], totalValue: 0, doneValue: 0 },
      },
      safetyClasses: [],
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
  const { stats, chartData, safetyClasses } = await getDashboardData();

  // Note: We can't use the useUser hook on the server.
  // The user's name would be fetched differently, but we'll use a placeholder for now.
  const userName = "Super Admin";

  return (
    <DashboardUI stats={stats} chartData={chartData} userName={userName} safetyClasses={safetyClasses} />
  );
}
