"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { account } from "@/lib/appwrite";

const LogoutButton = () => {
  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      // Force a full page reload to the home page
      window.location.assign("/");
    } catch (error) {
      console.error("Failed to log out:", error);
      alert("Failed to log out.");
    }
  };

  return (
    <Button variant="destructive" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
};

export default LogoutButton;
