"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUserDetailLocalStorage } from "@/hooks/useUser";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[]; // Support multiple roles
  redirectTo?: string; // Custom redirect path
  showLoading?: boolean; // Option to show/hide loading
  loadingMessage?: string; // Custom loading message
}

export default function AuthGuard({ 
  children, 
  requiredRole = "super_admin",
  redirectTo = "/",
  showLoading = true,
  loadingMessage = "Checking permissions..."
}: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication using localStorage
    const userStorage = loadUserDetailLocalStorage();
    
    console.log('🔍 AuthGuard: Checking auth from localStorage:', userStorage);
    
    if (!userStorage?.user) {
      console.log('🚫 AuthGuard: No user found in localStorage, redirecting to:', redirectTo);
      router.push(redirectTo);
      return;
    }

    const user = userStorage.user;
    const userRole = user.role;
    
    // Handle single role or multiple roles
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = allowedRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      console.log(`🚫 AuthGuard: User role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}], redirecting to:`, redirectTo);
      router.push(redirectTo);
      return;
    }

    console.log(`✅ AuthGuard: User authorized with role: ${userRole}`);
    setIsAuthorized(true);
    setIsLoading(false);
  }, [router, requiredRole, redirectTo]);

  // Show loading state if enabled
  if (isLoading && showLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            <div className="text-lg text-gray-600">{loadingMessage}</div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything while loading (if showLoading is false) or not authorized
  if (isLoading || !isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

// Convenience components for common role combinations
export function SuperAdminGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole="super_admin" {...props}>
      {children}
    </AuthGuard>
  );
}

export function FirmAdminGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole="firm_admin" {...props}>
      {children}
    </AuthGuard>
  );
}

export function AdminGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole={["super_admin", "firm_admin"]} {...props}>
      {children}
    </AuthGuard>
  );
}

export function EmployeeGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole="employee" {...props}>
      {children}
    </AuthGuard>
  );
}

export function AnyUserGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole={["super_admin", "firm_admin", "employee"]} {...props}>
      {children}
    </AuthGuard>
  );
}