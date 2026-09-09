import { Suspense } from "react";
import { marketing, describeError, marketingReadiness } from "../_lib/marketing";
import SetupNotice from "../_lib/SetupNotice";
import { updateLead, deleteLead } from "./actions";
import type { LeadRow } from "./types";
import LeadsTable from "./LeadsTable.client";

/**
 * Website → Leads.
 *
 * Every enquiry the public site captures: contact form, demo request, guide
 * download, Secure Score submission. Rows are written by the site's server
 * actions; a database webhook emails the team as each one lands, so this screen
 * is the working record rather than the notification.
 */

const REVALIDATE_PATH = "/website/leads";

async function getLeads(): Promise<LeadRow[]> {
  const db = await marketing();
  const { data, error } = await db
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error(`Failed to fetch leads:`, describeError(error));
    return [];
  }

  return (data ?? []).map((l: any) => ({
    id: l.id,
    name: l.name ?? "",
    email: l.email ?? "",
    company: l.company,
    phone: l.phone,
    jobTitle: l.job_title,
    message: l.message,
    source: l.source ?? "contact",
    sourceRef: l.source_ref,
    status: l.status ?? "new",
    ownerNotes: l.owner_notes,
    createdAt: l.created_at,
  }));
}

/* -------------------------- SERVER ACTIONS -------------------------- */

/* -------------------------------- PAGE -------------------------------- */

async function Content() {
  // One probe for the whole section: if the schema is unreachable every
  // screen fails identically, so say so once instead of rendering an
  // empty table that looks like "no content yet".
  const readiness = await marketingReadiness();
  if (!readiness.ok) return <SetupNotice readiness={readiness} />;

  const leads = await getLeads();
  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Leads</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enquiries from the public website. The team is emailed as each one
          arrives; this is where they get worked.
        </p>
      </div>
      <LeadsTable leads={leads} updateLead={updateLead} deleteLead={deleteLead} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-lg text-gray-600">Loading leads…</p>
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
