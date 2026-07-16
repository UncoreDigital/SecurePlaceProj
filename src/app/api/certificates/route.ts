import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { isValidIsoDate } from "@/lib/certificate-date";

// Certificate writes run here rather than from the browser client. A browser
// write has to resolve an access token first, which takes an exclusive
// navigator LockManager lock with no timeout — if that lock is held the call
// hangs forever without ever emitting a request, and the Save button spins
// with nothing to report. Server-side, auth comes off the request cookie.

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const WRITE_ROLES = ["super_admin", "firm_admin"];

/** Resolves the caller from the auth cookie and checks they may write certificates. */
async function authorize() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, firm_id")
    .eq("id", user.id)
    .single();

  if (!profile || !WRITE_ROLES.includes(profile.role)) {
    return { error: NextResponse.json({ error: "You are not allowed to manage certificates." }, { status: 403 }) };
  }
  return { user, profile };
}

type CertificatePayload = {
  title?: string;
  certificateDetails?: string;
  description?: string;
  locationId?: string;
  firm?: string;
  date?: string;
  signature?: string;
};

type CertificateRow = {
  title: string;
  certificate_details: string | null;
  description: string | null;
  location_id: string | null;
  firm_id: string;
  firm_name: string;
  issue_date: string;
  signer_name: string | null;
};

type RowResult = { ok: true; row: CertificateRow } | { ok: false; error: string };

/** Shared validation + column mapping for create and update. */
function buildRow(body: CertificatePayload, firmId: string): RowResult {
  if (!isValidIsoDate(body.date)) return { ok: false, error: "Please select a valid date." };

  return {
    ok: true,
    row: {
      title: (body.title ?? "").trim(),
      certificate_details: (body.certificateDetails ?? "").trim() || null,
      description: (body.description ?? "").trim() || null,
      location_id: body.locationId || null,
      firm_id: firmId,
      firm_name: (body.firm ?? "").trim(),
      issue_date: body.date as string,
      signer_name: (body.signature ?? "").trim() || null,
    },
  };
}

type FirmResult = { ok: true; firmId: string } | { ok: false; error: string };

/** Resolves the firm by name and enforces that a firm_admin can only touch their own. */
async function resolveFirm(
  firmName: string | undefined,
  profile: { role: string; firm_id: string | null }
): Promise<FirmResult> {
  if (!firmName?.trim()) return { ok: false, error: "Please select a firm." };

  const { data: firm } = await serviceClient()
    .from("firms")
    .select("id")
    .eq("name", firmName.trim())
    .maybeSingle();

  if (!firm) return { ok: false, error: "Invalid firm selected." };
  if (profile.role === "firm_admin" && firm.id !== profile.firm_id) {
    return { ok: false, error: "You can only issue certificates for your own firm." };
  }
  return { ok: true, firmId: firm.id as string };
}

async function readBody<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const body = await readBody<CertificatePayload>(req);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const firm = await resolveFirm(body.firm, auth.profile);
  if (!firm.ok) return NextResponse.json({ error: firm.error }, { status: 400 });

  const built = buildRow(body, firm.firmId);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

  const supabase = serviceClient();

  // certificate_number is UNIQUE but drawn from a sequence that can lag behind
  // rows already in the table, so a fresh number can still collide. Retry on
  // 23505 (unique_violation) — each attempt draws a new number and the
  // sequence walks past the existing values.
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: nextNumber, error: numberError } = await supabase.rpc("get_next_certificate_number");
    if (numberError) {
      return NextResponse.json({ error: `Could not generate a certificate number: ${numberError.message}` }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("certificates")
      .insert([{
        ...built.row,
        certificate_number: String(nextNumber),
        status: "issued" as const,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      }])
      .select()
      .single();

    if (!error) return NextResponse.json(data, { status: 201 });
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not allocate a unique certificate number. Please try again." },
    { status: 503 }
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Certificate id is required." }, { status: 400 });

  const supabase = serviceClient();

  let query = supabase.from("certificates").delete().eq("id", id);

  // Service role bypasses RLS, so re-apply the firm scope by hand — otherwise
  // a firm_admin could delete another firm's certificate by guessing an id.
  if (auth.profile.role === "firm_admin") {
    query = query.eq("firm_id", auth.profile.firm_id);
  }

  // Select the deleted row so a miss (wrong id, or another firm's) is a 404
  // rather than a silent success.
  const { data, error } = await query.select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });

  return NextResponse.json({ id: data.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const body = await readBody<CertificatePayload & { id?: string }>(req);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  if (!body.id) return NextResponse.json({ error: "Certificate id is required." }, { status: 400 });

  const firm = await resolveFirm(body.firm, auth.profile);
  if (!firm.ok) return NextResponse.json({ error: firm.error }, { status: 400 });

  const built = buildRow(body, firm.firmId);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

  const supabase = serviceClient();

  let query = supabase
    .from("certificates")
    .update({ ...built.row, updated_by: auth.user.id, updated_at: new Date().toISOString() })
    .eq("id", body.id);

  // Service role bypasses RLS, so re-apply the firm scope by hand.
  if (auth.profile.role === "firm_admin") {
    query = query.eq("firm_id", auth.profile.firm_id);
  }

  const { data, error } = await query.select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Certificate not found." }, { status: 404 });

  return NextResponse.json(data);
}
