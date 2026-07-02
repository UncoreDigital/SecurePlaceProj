import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/forms/[formId]/export?firmId=
// Auth is resolved server-side from the session cookie. The firmId param is
// only honoured for super_admin; firm_admin / location_admin are always locked
// to their own firm (and location) regardless of what the client sends.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  // ── 1. Authenticate & resolve role ────────────────────────────
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: me } = await authSupabase
    .from("user_profiles")
    .select("role, firm_id, is_all_location_admin")
    .eq("id", user.id)
    .single();

  if (!me || !["super_admin", "firm_admin", "location_admin"].includes(me.role)) {
    return NextResponse.json({ error: "Not authorized to export responses" }, { status: 403 });
  }

  // ── 2. Derive the data scope from the role ────────────────────
  const requestedFirmId = req.nextUrl.searchParams.get("firmId");

  let scopeFirmId: string | null = null;
  let scopeLocationId: string | null = null;

  if (me.role === "super_admin") {
    scopeFirmId = requestedFirmId || null; // optional filter
  } else {
    if (!me.firm_id) {
      return NextResponse.json(
        { error: "Your account has no firm assigned. Contact an administrator." },
        { status: 403 }
      );
    }
    scopeFirmId = me.firm_id;

    if (me.role === "location_admin" && !me.is_all_location_admin) {
      const { data: loc } = await authSupabase
        .from("locations")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!loc) {
        return NextResponse.json(
          { error: "Your account has no location assigned. Contact an administrator." },
          { status: 403 }
        );
      }
      scopeLocationId = loc.id;
    }
  }

  const supabase = adminClient();

  // ── 3. Fetch form ──────────────────────────────────────────────
  const { data: form, error: formErr } = await supabase
    .from("class_forms")
    .select(`
      id, title, pass_score,
      safety_classes:safety_class_id(title)
    `)
    .eq("id", formId)
    .maybeSingle();

  if (formErr || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  // ── 4. Fetch responses within scope ───────────────────────────
  let responseQuery = supabase
    .from("form_responses")
    .select(`
      id, employee_name, employee_email, score, passed, submitted_at,
      marks_obtained, total_marks,
      firm_id, location_id,
      firms:firm_id(name),
      locations:location_id(name)
    `)
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });

  if (scopeFirmId) responseQuery = responseQuery.eq("firm_id", scopeFirmId);
  if (scopeLocationId) responseQuery = responseQuery.eq("location_id", scopeLocationId);

  const { data: responses, error: respErr } = await responseQuery;
  if (respErr) {
    return NextResponse.json({ error: respErr.message }, { status: 500 });
  }
  const allResponses = responses ?? [];

  // ── 5. Build the workbook ─────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SecurePlace";
  workbook.created = new Date();

  // Scope labels for the summary sheet
  let firmLabel = "All Companies";
  if (scopeFirmId) {
    const { data: f } = await supabase
      .from("firms").select("name").eq("id", scopeFirmId).maybeSingle();
    firmLabel = f?.name ?? "Unknown Company";
  }
  let locationLabel = "All Locations";
  if (scopeLocationId) {
    const { data: l } = await supabase
      .from("locations").select("name").eq("id", scopeLocationId).maybeSingle();
    locationLabel = l?.name ?? "Unknown Location";
  }

  const totalPassed = allResponses.filter((r: any) => r.passed).length;
  const avgScore = allResponses.length
    ? Math.round(allResponses.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / allResponses.length)
    : 0;

  // -- Summary sheet --
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ width: 24 }, { width: 60 }];
  const summaryRows: [string, string | number][] = [
    ["Form", form.title],
    ["Safety Class", (form.safety_classes as any)?.title ?? "—"],
    ["Company", firmLabel],
    ["Location", locationLabel],
    ["Pass Score", `${form.pass_score}%`],
    ["Total Submissions", allResponses.length],
    ["Passed", totalPassed],
    ["Failed", allResponses.length - totalPassed],
    ["Average Score", `${avgScore}%`],
    ["Exported At", new Date().toLocaleString()],
    ["Exported By", user.email ?? me.role],
  ];
  for (const [k, v] of summaryRows) {
    const row = summary.addRow([k, v]);
    row.getCell(1).font = { bold: true };
  }

  // -- Responses sheet --
  const sheet = workbook.addWorksheet("Responses");
  const headerRow = sheet.addRow([
    "#", "Name", "Email", "Company", "Location",
    "Marks Obtained", "Total Marks", "Score (%)", "Result", "Submitted At",
  ]);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF7" } };
    cell.border = { bottom: { style: "thin" } };
  });

  allResponses.forEach((r: any, i: number) => {
    const row = sheet.addRow([
      i + 1,
      r.employee_name,
      r.employee_email ?? "—",
      (r.firms as any)?.name ?? "Unknown",
      (r.locations as any)?.name ?? "—",
      r.marks_obtained ?? "—",
      r.total_marks ?? "—",
      r.score ?? 0,
      r.passed ? "Passed" : "Failed",
      r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—",
    ]);
    const resultCell = row.getCell(9);
    resultCell.font = { color: { argb: r.passed ? "FF15803D" : "FFDC2626" }, bold: true };
  });

  // Column widths
  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 28;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 22;
  [6, 7, 8].forEach((c) => (sheet.getColumn(c).width = 14));
  sheet.getColumn(9).width = 10;
  sheet.getColumn(10).width = 20;

  if (allResponses.length === 0) {
    sheet.addRow([]);
    sheet.addRow(["No responses found for the selected scope."]);
  }

  // ── 7. Send the file ──────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const safeTitle = form.title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").slice(0, 60) || "form";
  const filename = `responses-${safeTitle}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
