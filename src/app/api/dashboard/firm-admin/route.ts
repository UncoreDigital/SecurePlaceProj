import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firm_id");
  const locationId = req.nextUrl.searchParams.get("location_id") || null;

  if (!firmId) {
    return NextResponse.json({ error: "firm_id is required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Build scheduled_classes query — filter by location if provided
  let classesQuery = supabase
    .from("scheduled_classes")
    .select(`*, safety_class: safety_class_id(title, id, type, duration_minutes, mode), firms:firm_id(name), locations:location_id(id, name)`)
    .eq("firm_id", firmId)
    .order("start_time", { ascending: false });

  if (locationId) classesQuery = classesQuery.eq("location_id", locationId);

  // Employee counts — filter by location if provided
  let empQuery = supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "employee")
    .eq("firm_id", firmId);

  let volQuery = supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "employee")
    .eq("firm_id", firmId)
    .eq("is_volunteer", true);

  if (locationId) {
    empQuery = empQuery.eq("location_id", locationId) as any;
    volQuery = volQuery.eq("location_id", locationId) as any;
  }

  const [empRes, volRes, classesRes] = await Promise.all([empQuery, volQuery, classesQuery]);

  const classesData = classesRes.data ?? [];

  const completedDrills = classesData.filter(
    (x: any) => x.status === "completed" && x?.safety_class?.type?.toLowerCase() === "drill"
  );
  const completedWorkshops = classesData.filter(
    (x: any) => x.status === "completed" && x?.safety_class?.type?.toLowerCase() === "safety class"
  );

  const drillTotal = 2, workshopTotal = 4, complianceTotal = 6;
  const drillDone = completedDrills.length;
  const workshopDone = completedWorkshops.length;
  const complianceDone = Math.min(drillDone, drillTotal) + Math.min(workshopDone, workshopTotal);

  const makeChart = (done: number, total: number) =>
    done >= total
      ? [{ name: "Done", value: done }]
      : [{ name: "Done", value: done }, { name: "Pending", value: total - done }];

  return NextResponse.json({
    stats: {
      employees: empRes.count ?? 0,
      volunteers: volRes.count ?? 0,
      emergencies: 0,
    },
    chartData: {
      drills: { data: makeChart(drillDone, drillTotal), totalValue: drillTotal, doneValue: drillDone },
      workshops: { data: makeChart(workshopDone, workshopTotal), totalValue: workshopTotal, doneValue: workshopDone },
      compliance: { data: makeChart(complianceDone, complianceTotal), totalValue: complianceTotal, doneValue: complianceDone },
    },
    safetyClasses: classesData,
  });
}
