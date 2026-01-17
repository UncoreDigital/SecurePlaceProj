"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useUser, loadUserDetailLocalStorage } from "@/hooks/useUser";

import {
  LayoutDashboard,
  Building,
  Users,
  MapPin,
  Target,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Siren,
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
  { href: "/drills", label: "Drills", icon: Target },
  { href: "/certifications", label: "Certification", icon: BookOpen },
];

const FIRM_ADMIN_ITEMS: NavItem[] = [
  { href: "/firm-admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/firm-profile", label: "Firm Profile", icon: Building },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/safety-classes", label: "Safety Classes", icon: GraduationCap },
  { href: "/scheduled-classes", label: "Requested Classes", icon: Calendar },
  { href: "/certifications", label: "Certification", icon: BookOpen },
];

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  
  // Get user role synchronously from localStorage for instant display
  const getUserRole = () => {
    if (typeof window === 'undefined') return 'super_admin'; // SSR fallback
    
    try {
      const cached = loadUserDetailLocalStorage();
      return cached?.user?.role || 'super_admin'; // Default to super_admin for instant display
    } catch {
      return 'super_admin'; // Fallback
    }
  };

  // Get initial role immediately (no async)
  const [userRole, setUserRole] = useState(() => getUserRole());
  const { user, logout } = useUser();

  // Update role when real user data loads (but sidebar is already visible)
  useEffect(() => {
    if (user?.role && user.role !== userRole) {
      setUserRole(user.role);
      console.log('🔄 Sidebar: Updated to real user role:', user.role);
    }
  }, [user?.role, userRole]);

  // Choose nav items - always returns items for instant display
  const navItems = useMemo<NavItem[]>(() => {
    if (userRole === "firm_admin") return FIRM_ADMIN_ITEMS;
    return SUPER_ADMIN_ITEMS; // Default to super admin for instant display
  }, [userRole]);

  const toggleSidebar = () => setIsOpen((v) => !v);

  const handleLogout = () => {
    console.log('🚐 Fast logout initiated from sidebar...');
    
    // Don't await - just trigger logout and redirect immediately
    logout(); // Fire and forget
    
    // Immediate redirect without waiting
    window.location.href = '/';
  };

  return (
    <aside
      className={`relative hidden lg:flex flex-col bg-white border-r transition-all duration-300 ${isOpen ? "w-64" : "w-20"
        }`}
    >
      {/* Logo Section - Renders instantly */}
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

      {/* Navigation Section - Renders instantly with menu items */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
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
      </nav>

      {/* Footer Section - Renders instantly */}
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
