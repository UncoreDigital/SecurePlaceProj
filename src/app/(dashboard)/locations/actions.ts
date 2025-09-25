"use server";

import { databases } from "@/lib/appwrite-server";
import { getSession } from "@/lib/auth"; // Securely get the user's session
import { ID } from "node-appwrite";
import { revalidatePath } from "next/cache";

// Define the shape of the form data
type LocationData = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact: string;
};

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_LOCATIONS_COLLECTION_ID!;

export async function createLocation(data: LocationData) {
  try {
    const { userProfile } = await getSession();

    // Security Check: Ensure user is a firm admin and has a firmId
    if (userProfile?.role !== "firm_admin" || !userProfile.firmId) {
      throw new Error("Unauthorized: Only firm admins can create locations.");
    }

    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId =
      process.env.NEXT_PUBLIC_APPWRITE_LOCATIONS_COLLECTION_ID!;

    await databases.createDocument(databaseId, collectionId, ID.unique(), {
      ...data,
      firmId: userProfile.firmId, // Automatically add the firmId from the session
    });

    revalidatePath("/dashboard/locations"); // Refresh the locations list
    return { success: "Location created successfully." };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateLocation(id: string, data: LocationData) {
  try {
    const { userProfile } = await getSession();
    if (userProfile?.role !== "firm_admin" || !userProfile.firmId) {
      throw new Error("Unauthorized");
    }

    // Security check: Verify the location belongs to the admin's firm
    const currentLocation = await databases.getDocument(
      databaseId,
      collectionId,
      id
    );
    if (currentLocation.firmId !== userProfile.firmId) {
      throw new Error("Forbidden: You cannot modify this location.");
    }

    await databases.updateDocument(databaseId, collectionId, id, data);
    revalidatePath("/dashboard/locations");
    return { success: "Location updated." };
  } catch (e: any) {
    return { error: e.message };
  }
}

// DELETE a location
export async function deleteLocation(id: string) {
  try {
    const { userProfile } = await getSession();
    if (userProfile?.role !== "firm_admin" || !userProfile.firmId) {
      throw new Error("Unauthorized");
    }

    // Security check: Verify the location belongs to the admin's firm
    const currentLocation = await databases.getDocument(
      databaseId,
      collectionId,
      id
    );
    if (currentLocation.firmId !== userProfile.firmId) {
      throw new Error("Forbidden: You cannot delete this location.");
    }

    await databases.deleteDocument(databaseId, collectionId, id);
    revalidatePath("/dashboard/locations");
    return { success: "Location deleted." };
  } catch (e: any) {
    return { error: e.message };
  }
}
