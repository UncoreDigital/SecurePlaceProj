import { Suspense } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";
import CertificationsClient from "./Certifications.client";

type CertItem = {
  id: string;
  title: string;
  recipient: string;
  firm?: string;
  firm_logo?: string;
  issue_date?: string;
  signature?: string;
  location_id?: string;
  location_name?: string;
  description?: string;
  certificate_details?: string;
};

async function getCertificates(
  userRole: string,
  userFirmId?: string | null,
  userLocationId?: string | null,
): Promise<CertItem[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    let query = supabase
      .from("certificates")
      .select(`
        id,
        title,
        issue_date,
        recipient_name,
        firm_name,
        signer_name,
        description,
        location_id,
        certificate_details,
        firms (
          logo_url
        ),
        locations (
          name
        )
      `)
      .order("created_at", { ascending: false });

    // super_admin → no filter, sees everything
    // firm_admin  → scoped to their firm
    // location_admin → scoped to their firm AND their location
    if (userRole === "firm_admin" && userFirmId) {
      query = query.eq("firm_id", userFirmId);
    } else if (userRole === "location_admin" && userFirmId && userLocationId) {
      query = query.eq("firm_id", userFirmId).eq("location_id", userLocationId);
    } else if (userRole !== "super_admin") {
      // any other role (employee etc.) sees nothing
      return [];
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching certificates:", error.message);
      return [];
    }

    return (data || []).map((cert: any) => ({
      id: cert.id,
      title: cert.title,
      recipient: cert.recipient_name,
      firm: cert.firm_name,
      firm_logo: cert.firms?.logo_url || undefined,
      issue_date: cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : undefined,
      signature: cert.signer_name || undefined,
      description: cert.description,
      location_id: cert.location_id || undefined,
      location_name: cert.locations?.name || undefined,
      certificate_details: cert.certificate_details,
    }));
  } catch (error) {
    console.error("Failed to fetch certificates:", error);
    return [];
  }
}

function LoadingSpinner() {
  return (
    <div className="space-y-4">
      <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2">
        <span>Home</span>
        <span>&gt;</span>
        <span>Certifications</span>
      </nav>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

async function CertificationsContent() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-4">
        <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2">
          <span>Home</span>
          <span>&gt;</span>
          <span>Certifications</span>
        </nav>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Certifications</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-slate-500 text-sm text-center py-8">
            Please log in to view certifications.
          </p>
        </div>
      </div>
    );
  }

  // Resolve role, firm, and location for the logged-in user
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, firm_id")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role ?? "employee";
  const userFirmId = profile?.firm_id ?? null;

  // For location_admin: resolve their location via auth_user_id
  let userLocationId: string | null = null;
  if (userRole === "location_admin") {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    userLocationId = loc?.id ?? null;
  }

  const certificates = await getCertificates(userRole, userFirmId, userLocationId);

  return (
    <CertificationsClient
      initialCertificates={certificates}
      userRole={userRole}
    />
  );
}

export default async function CertificationsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CertificationsContent />
    </Suspense>
  );
}