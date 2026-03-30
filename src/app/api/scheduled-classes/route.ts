import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firm_id");
  const locationId = req.nextUrl.searchParams.get("location_id");

  if (!firmId) return NextResponse.json({ error: "firm_id required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let query = supabase
    .from("scheduled_classes")
    .select(`*, safety_class: safety_class_id(title, id), firms:firm_id(name), locations:location_id(id, name)`)
    .eq("firm_id", firmId)
    .order("start_time", { ascending: false });

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const formatToIST = (iso?: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return ""; }
  };

  const formatted = (data ?? []).map((cls: any) => ({
    id: cls.id,
    title: cls.safety_class?.title ?? "Untitled",
    date: cls.start_time ? new Date(cls.start_time).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
    time: cls.start_time && cls.end_time ? `${formatToIST(cls.start_time)} to ${formatToIST(cls.end_time)}` : "",
    status: cls.status ?? "pending",
    firm: cls.firms?.name || "-",
    firmId: cls.firm_id || "",
    location: cls.locations?.name || "Remote",
    location_id: cls.location_id || null,
    created_at: cls.created_at ? new Date(cls.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
    safetyClassId: cls.safety_class?.id || null,
  }));

  return NextResponse.json(formatted);
}
