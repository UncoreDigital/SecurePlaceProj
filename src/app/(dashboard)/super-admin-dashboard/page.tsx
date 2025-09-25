import { databases } from "@/lib/appwrite-server"; // <-- Use the server client
import { Query, Models } from "appwrite";
import { DashboardUI } from "./DashboardUI";

// Define interfaces for our data structures
interface SafetyTraining extends Models.Document {
  type: string;
  status: string;
}

// This function now runs securely on the server
async function getDashboardData() {
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

    // Fetch all data concurrently
    const [
      employeeData,
      volunteerData,
      emergencyData,
      completedDrills,
      pendingDrills,
      workshopsData,
    ] = await Promise.all([
      databases.listDocuments(databaseId, usersCollectionId),
      databases.listDocuments(databaseId, usersCollectionId, [
        Query.equal("isVolunteer", true),
      ]),
      databases.listDocuments(databaseId, incidentsCollectionId),
      databases.listDocuments(databaseId, drillsCollectionId, [
        Query.equal("status", "completed"),
      ]),
      databases.listDocuments(databaseId, drillsCollectionId, [
        Query.equal("status", "pending"),
      ]),
      databases.listDocuments<SafetyTraining>(
        databaseId,
        trainingsCollectionId
      ),
    ]);

    // Process chart data
    const workshopTypes: { [key: string]: number } = {};
    workshopsData.documents.forEach((doc) => {
      workshopTypes[doc.type] = (workshopTypes[doc.type] || 0) + 1;
    });
    const processedWorkshops = Object.entries(workshopTypes).map(
      ([name, value]) => ({ name, value })
    );

    // Return all processed data
    return {
      stats: {
        employees: employeeData.total,
        volunteers: volunteerData.total,
        emergencies: emergencyData.total,
      },
      chartData: {
        drills: [
          { name: "Completed", value: completedDrills.total },
          { name: "Pending", value: pendingDrills.total },
        ],
        workshops: processedWorkshops,
        compliance: [
          {
            name: "Workshops Done",
            value: workshopsData.documents.filter(
              (d) => d.status === "completed"
            ).length,
          },
          { name: "Drills Done", value: completedDrills.total },
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
