import { cookies } from "next/headers";
import { account, databases } from "./appwrite";
import { AppwriteException, Query } from "appwrite";
import { Models } from "appwrite";

interface UserProfile extends Models.Document {
  role: string;
  firmId?: string;
}

export async function getSession() {
  try {
    const sessionCookies = cookies().get("my-session");
    if (!sessionCookies) throw new Error("No session found");

    account.client.setSession(sessionCookies.value);

    const user = await account.get();

    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

    const profileResponse = await databases.listDocuments<UserProfile>(
      databaseId,
      collectionId,
      [Query.equal("userId", user.$id)]
    );

    if (profileResponse.documents.length === 0)
      throw new Error("User profile not found");

    return { user, userProfile: profileResponse.documents[0] };
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 401) {
      return { user: null, userProfile: null };
    }
    throw e;
  }
}
