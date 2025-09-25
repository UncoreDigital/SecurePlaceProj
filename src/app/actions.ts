"use server";

import { account } from "@/lib/appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppwriteException } from "appwrite";
import { databases } from "@/lib/appwrite-server";
import { Query } from "node-appwrite";

export async function createSessionCookie(secret: string) {
  (await cookies()).set("my-session", secret, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function deleteSessionCookie() {
  (await cookies()).delete("my-session");
  redirect("/");
}

export async function login(email: string, password: string) {
  try {
    // 1. Create the user session
    const session = await account.createEmailPasswordSession(email, password);

    // 2. Set the secure cookie
    (
      await // 2. Set the secure cookie
      cookies()
    ).set("my-session", session.secret, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // 3. Fetch the user's profile to get their role
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

    const profileResponse = await databases.listDocuments(
      databaseId,
      collectionId,
      [Query.equal("userId", session.userId)]
    );

    if (profileResponse.documents.length === 0) {
      throw new Error("User profile not found.");
    }

    const userProfile = profileResponse.documents[0];

    // 4. Return success along with the user's role
    return { success: true, role: userProfile.role };
  } catch (e: any) {
    console.error("Login action failed:", e);
    const errorMessage =
      e instanceof AppwriteException ? e.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function logoutAndRedirect() {
  try {
    const sessionCookie = (await cookies()).get("my-session");
    if (sessionCookie) {
      // Set the session for the SDK to know which session to delete
      account.client.setSession(sessionCookie.value);
      await account.deleteSession("current");
      (await cookies()).delete("my-session");
    }
  } catch (e) {
    console.error("Logout failed:", e);
  }
  // Redirect to the login page after logging out
  redirect("/");
}
