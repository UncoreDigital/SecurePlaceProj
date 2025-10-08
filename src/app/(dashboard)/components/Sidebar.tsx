"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useUser } from "@/hooks/useUser"; // must return { user?: { role?: string } }
import { createBrowserClient } from "@supabase/ssr";

import {
  LayoutDashboard,
  Building,
  Users,
  MapPin,
  UserSquare,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Siren,
  BellRing,
  BookOpen,
  UserCog,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const SUPER_ADMIN_ITEMS: NavItem[] = [
  { href: "/super-admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/firm-management", label: "Firms", icon: Building },
  { href: "/firm-admin-management", label: "Firm Admins", icon: UserCog },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/safety-classes", label: "Safety Classes", icon: GraduationCap },
  { href: "/scheduled-classes", label: "Requested Classes", icon: Calendar },
  { href: "/emergencies", label: "Emergencies", icon: Siren },
  // { href: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  { href: "drills", label: "Drills", icon: UserSquare },
  // { href: "/dashboard/training", label: "Training", icon: BookOpen },
  { href: "/certification", label: "Certification", icon: BookOpen },
];

const FIRM_ADMIN_ITEMS: NavItem[] = [
  { href: "/firm-admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/firm-profile", label: "Firm Profile", icon: Building },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/safety-classes", label: "Safety Classes", icon: GraduationCap },
  { href: "/scheduled-classes", label: "Requested Classes", icon: Calendar },
  // { href: "/emergencies", label: "Emergencies", icon: Siren },
  // { href: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  // { href: "/drills", label: "Drills", icon: UserSquare },
];

// Page-local supabase client (browser)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, anon);
}

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { user, logout } = useUser(); // Get logout function from useUser hook
  const pathname = usePathname();
  const router = useRouter();

  // Choose nav items based on role (memoized)
  const navItems = useMemo<NavItem[]>(() => {
    if (user?.role === "super_admin") return SUPER_ADMIN_ITEMS;
    if (user?.role === "firm_admin") return FIRM_ADMIN_ITEMS;
    // Unknown/Loading role → empty list (prevents flash of wrong items)
    return [];
  }, [user?.role]);

  const toggleSidebar = () => setIsOpen((v) => !v);

  const handleLogout = async () => {
    try {
      console.log('🚐 Initiating logout from sidebar...');
      
      // Use the useUser logout function which clears localStorage
      await logout();
      
      // Navigate to home page after successful logout
      router.push('/');
      
      console.log('✅ Logout completed successfully');
    } catch (err) {
      console.error("Failed to log out:", err);
      
      // Force navigation even if logout fails
      window.location.assign("/");
    }
  };

  return (
    <aside
      className={`relative hidden lg:flex flex-col bg-white border-r transition-all duration-300 ${isOpen ? "w-64" : "w-20"
        }`}
    >
      <div className="flex items-center justify-center h-20 px-4 border-b">
        {isOpen ? (
          <Image
            src="/images/logo-2.png"
            alt="Secure Place Logo"
            width={150}
            height={40}
            priority
          />
        ) : (
          <Image
            src="/images/logo-3.png"
            alt="Secure Place Icon"
            width={40}
            height={40}
            priority
          />
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          // active for exact and nested routes
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={`flex items-center p-2 rounded-md transition-colors ${isActive
                  ? "bg-brand-blue text-white"
                  : "text-slate-700 hover:bg-brand-blue hover:text-white"
                }`}
            >
              <Icon className="h-6 w-6 shrink-0" />
              {isOpen && <span className="ml-3 truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Optional: show a subtle hint while role is loading */}
        {navItems.length === 0 && (
          <div className="text-sm text-slate-400 px-2">Loading menu…</div>
        )}
      </nav>

      <div className="border-t p-4 space-y-2">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-colors"
        >
          <LogOut className="h-6 w-6" />
          {isOpen && <span className="ml-3 font-semibold cursor-pointer">Logout</span>}
        </button>

        <Button
          variant="outline"
          size="icon"
          className="w-full cursor-pointer"
          onClick={toggleSidebar}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <ChevronsLeft className="h-6 w-6" />
          ) : (
            <ChevronsRight className="h-6 w-6" />
          )}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
