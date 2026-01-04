"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/(dashboard)/components/Sidebar";
import Header from "@/app/(dashboard)/components/Header";
import { validateSession, setupSessionMonitoring, redirectToLogin } from "@/lib/session-utils";

// Loading component for session check
function SessionCheckLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        <div className="text-lg text-gray-600">Verifying access...</div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);

  // Check session on every route access
  useEffect(() => {
    console.log('🔐 Dashboard: Validating session...');
    
    // Add debugging
    const rawSession = localStorage.getItem('secure_place_user_session');
    console.log('🔍 Dashboard: Raw session from localStorage:', rawSession);
    
    const { isValid, user, reason } = validateSession(true); // Use strict validation for dashboard
    
    console.log('🔍 Dashboard: Validation result:', { isValid, user, reason });
    
    if (!isValid) {
      console.log('❌ Dashboard: Session invalid -', reason);
      setIsSessionValid(false);
      redirectToLogin();
      return;
    }
    
    console.log('✅ Dashboard: Session valid for user:', user.email, '- Role:', user.role);
    setIsSessionValid(true);
    
    // Setup session monitoring for cross-tab logout and periodic checks
    const cleanup = setupSessionMonitoring(() => {
      console.log('🔄 Dashboard: Session lost, redirecting to login');
      setIsSessionValid(false);
      redirectToLogin();
    });
    
    return cleanup;
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  // Show loading while checking session
  if (isSessionValid === null) {
    return <SessionCheckLoader />;
  }

  // If session is invalid, don't render dashboard (redirect is already happening)
  if (isSessionValid === false) {
    return <SessionCheckLoader />;
  }

  // Render dashboard only if session is valid
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
