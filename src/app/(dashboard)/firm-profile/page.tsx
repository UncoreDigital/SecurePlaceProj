import { Suspense } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building } from "lucide-react";
import { FirmAdminGuard } from "@/components/AuthGuard";
import FirmProfileClient from "./FirmProfile.client";

interface FirmProfile {
  id: string;
  name: string;
  industry: string;
  contact_email: string;
  phone_number: string;
  address: string;
  created_at: string;
  description?: string;
  website?: string;
}

async function getFirmData(firmId: string): Promise<FirmProfile | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase
    .from("firms")
    .select("*")
    .eq("id", firmId)
    .single();

  if (error) {
    console.error("Failed to fetch firm data:", error.message);
    return null;
  }

  return data;
}

function LoadingSpinner() {
  return (
    <FirmAdminGuard>
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-brand-blue">Firm Profile</h1>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    </FirmAdminGuard>
  );
}

async function FirmProfileContent() {
  // Get current user context server-side (same pattern as employees page)
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userRole = "employee";
  let userFirmId = null;
  let firmData: FirmProfile | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, firm_id")
      .eq("id", user.id)
      .single();
    
    if (profile) {
      userRole = profile.role;
      userFirmId = profile.firm_id;
      
      // Fetch firm data if user has a firm
      if (userFirmId) {
        firmData = await getFirmData(userFirmId);
      }
    }
  }

  // Handle different states
  if (!user) {
    return (
      <FirmAdminGuard>
        <div className="container mx-auto py-10">
          <h1 className="text-3xl font-bold text-brand-blue mb-6">Firm Profile</h1>
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">User not found</p>
              <p className="text-sm text-gray-500">Please log in to view your firm profile.</p>
            </CardContent>
          </Card>
        </div>
      </FirmAdminGuard>
    );
  }

  if (!userFirmId) {
    return (
      <FirmAdminGuard>
        <div className="container mx-auto py-10">
          <h1 className="text-3xl font-bold text-brand-blue mb-6">Firm Profile</h1>
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No firm associated</p>
              <p className="text-sm text-gray-500">Your account is not associated with any firm.</p>
              <p className="text-xs text-gray-400 mt-2">
                Debug: userId={user.id}, role={userRole}
              </p>
            </CardContent>
          </Card>
        </div>
      </FirmAdminGuard>
    );
  }

  if (!firmData) {
    return (
      <FirmAdminGuard>
        <div className="container mx-auto py-10">
          <h1 className="text-3xl font-bold text-brand-blue mb-6">Firm Profile</h1>
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No firm data found</p>
              <p className="text-sm text-gray-500">Please contact support if this is an error.</p>
              <p className="text-xs text-gray-400 mt-2">
                Debug: firmId={userFirmId}, userId={user.id}
              </p>
            </CardContent>
          </Card>
        </div>
      </FirmAdminGuard>
    );
  }

  return (
    <FirmAdminGuard>
      <FirmProfileClient 
        initialFirmData={firmData}
        userRole={userRole}
        userId={user.id}
      />
    </FirmAdminGuard>
  );
}

export default async function FirmProfilePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FirmProfileContent />
    </Suspense>
  );
}