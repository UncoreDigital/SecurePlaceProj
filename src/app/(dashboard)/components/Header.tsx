"use client";

import { Bell, Mail, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser"; // ⬅️ uses Supabase (no Appwrite)

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, loading } = useUser();

  const displayName = user?.fullName || user?.email?.split("@")[0] || "Admin";
  const roleLabel = user?.role || "—";

  return (
    <header className="flex items-center justify-between h-20 px-6 bg-white border-b">
      {/* Left side */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="lg:hidden mr-4"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-brand-blue">Dashboard</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-6">
        <button
          className="text-slate-500 hover:text-brand-orange transition-colors"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-6 w-6" />
        </button>
        <button
          className="text-slate-500 hover:text-brand-orange transition-colors"
          aria-label="Messages"
          title="Messages"
        >
          <Mail className="h-6 w-6" />
        </button>

        <div className="flex items-center">
          <Avatar>
            <AvatarImage
              src="https://github.com/shadcn.png"
              alt={displayName}
            />
            <AvatarFallback>
              {displayName
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "AD"}
            </AvatarFallback>
          </Avatar>

          <div className="ml-3 text-left">
            {loading ? (
              <>
                <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-slate-100 rounded mt-1 animate-pulse" />
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-brand-blue">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
