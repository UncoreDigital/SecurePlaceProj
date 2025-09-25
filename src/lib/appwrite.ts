import {
  Account,
  Avatars,
  Client,
  Databases,
  Storage,
  Functions,
} from "appwrite";

const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!appwriteEndpoint || !appwriteProjectId) {
  throw new Error(
    "Missing Appwrite environment variables. Please check your .env.local file."
  );
}

const client = new Client()
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProjectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export const functions = new Functions(client);

export default client;
