import { Client, Databases, Users } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const isConfigured = Boolean(endpoint && projectId && apiKey);

if (!isConfigured) {
  console.warn(
    "[appwrite-server] Appwrite env vars are not set — Appwrite features will be skipped."
  );
}

// Only build the client when all three vars are present
const client = isConfigured
  ? new Client().setEndpoint(endpoint!).setProject(projectId!).setKey(apiKey!)
  : null;

export const databases: Databases | null = client ? new Databases(client) : null;
export const users: Users | null = client ? new Users(client) : null;
export const appwriteConfigured = isConfigured;
