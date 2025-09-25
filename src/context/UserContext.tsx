"use client";

import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { account, databases } from "@/lib/appwrite";
import { Models, Query } from "appwrite";
import { deleteSessionCookie } from "@/app/actions";

export interface UserSession extends Models.User<Models.Preferences> {
  fullName?: string;
  role?: string;
  firmId?: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  refetchUser: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refetchUser: () => {
    throw new Error("refetchUser function not implemented");
  }, // Default placeholder
  logout: () => {
    throw new Error("logout function not implemented");
  },
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // This is the real implementation of the function
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const loggedInUser = await account.get();

      const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
      const collectionId =
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

      const profile = await databases.listDocuments(databaseId, collectionId, [
        Query.equal("userId", loggedInUser.$id),
      ]);

      if (profile.documents.length > 0) {
        const userProfile = profile.documents[0];
        setUser({
          ...loggedInUser,
          fullName: userProfile.fullName,
          role: userProfile.role,
          firmId: userProfile.firmId,
        });
      } else {
        setUser(loggedInUser);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutUser = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      await deleteSessionCookie();
    } catch (error) {
      console.error(error);
      await deleteSessionCookie();
    }
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Here, we provide the REAL functions to the context
  const value = { user, loading, refetchUser: fetchUser, logout: logoutUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
