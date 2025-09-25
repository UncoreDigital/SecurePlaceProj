import { Client, Users, Databases, ID } from 'node-appwrite';

// Appwrite's ES Module runtime passes a single context object
export default async ({ req, res, log, error }) => {
  const client = new Client();
  const users = new Users(client);
  const databases = new Databases(client);

  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
    NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
  } = process.env;

  if (
    !APPWRITE_ENDPOINT ||
    !APPWRITE_PROJECT_ID ||
    !APPWRITE_API_KEY ||
    !NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    !NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID
  ) {
    error("Function environment variables are not set.");
    return res.json({ success: false, message: "Server configuration error." }, 500);
  }

  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  try {
    const payload = JSON.parse(req.payload);
    const { email, password, fullName, role, firmId, employeeCode } = payload;
    
    const newUser = await users.create(
      ID.unique(),
      email,
      password,
      fullName
    );

    const profileData = {
      userId: newUser.$id,
      firmId: firmId,
      role: role,
      fullName: fullName,
      officialEmail: email,
      employeeCode: employeeCode,
    };
    
    const newProfile = await databases.createDocument(
      NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      ID.unique(),
      profileData
    );

    const successResponse = {
      success: true,
      message: "User and profile created successfully.",
      profile: newProfile,
    };
    log("Function succeeded. Sending response:", JSON.stringify(successResponse));
    return res.json(successResponse);

  } catch (e) {
    error(e.message);
    
    const errorResponse = {
      success: false,
      message: e.message || "An unknown error occurred in the function.",
    };
    log("Function failed. Sending error response:", JSON.stringify(errorResponse));
    return res.json(errorResponse, 500);
  }
};