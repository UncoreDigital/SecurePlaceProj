import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firm_id");
  const locationId = req.nextUrl.searchParams.get("location_id");
  const q = req.nextUrl.searchParams.get("q") ?? "";

  if (!firmId) return NextResponse.json({ error: "firm_id required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let query = supabase
    .from("profiles")
    .select("id, full_name, official_email, employee_code, phone, is_volunteer, role, firm_id, location_id, firms:firm_id(name)")
    .eq("role", "employee")
    .eq("firm_id", firmId)
    .order("full_name", { ascending: true });

  if (q.trim()) query = query.ilike("full_name", `%${q}%`);
  if (locationId) query = (query as any).eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.full_name ?? "",
      email: row.official_email ?? "",
      employeeCode: row.employee_code ?? null,
      contactNumber: row.phone ?? null,
      isVolunteer: !!row.is_volunteer,
      firmId: row.firm_id || null,
      firmName: row.firms?.name ?? "N/A",
    }))
  );
}
