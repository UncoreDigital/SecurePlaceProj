import { Client, Databases, Users } from "node-appwrite";

console.log(
  "SERVER-SIDE KEY CHECK:",
  process.env.APPWRITE_API_KEY
    ? "API Key is LOADED"
    : "API Key is MISSING or UNDEFINED"
);

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // Uses the server-side API Key

export const databases = new Databases(client);
export const users = new Users(client);
