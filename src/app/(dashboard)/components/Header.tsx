"use client";

import { useState } from "react";
import { Bell, HelpCircle, Menu, X, Mail, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser"; // ⬅️ uses Supabase (no Appwrite)

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, loading } = useUser();
  const [showSupportModal, setShowSupportModal] = useState(false);

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
          aria-label="Support"
          title="Support"
          onClick={() => setShowSupportModal(true)}
        >
          <HelpCircle className="h-6 w-6" />
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

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-brand-blue">Contact Us</h2>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-brand-blue/10 p-3 rounded-full">
                  <Mail className="h-6 w-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <a
                    href="mailto:chaplotpratik@gmail.com"
                    className="text-lg font-semibold text-brand-blue hover:text-brand-orange transition-colors"
                  >
                    chaplotpratik@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-brand-orange/10 p-3 rounded-full">
                  <Phone className="h-6 w-6 text-brand-orange" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact</p>
                  <a
                    href="tel:+919563214780"
                    className="text-lg font-semibold text-brand-blue hover:text-brand-orange transition-colors"
                  >
                    +91 8552859594
                  </a>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={() => setShowSupportModal(false)}
                className="bg-brand-blue hover:bg-brand-blue/90"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
