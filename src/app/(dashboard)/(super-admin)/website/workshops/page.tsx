import { Suspense } from "react";
import {
  marketing,
  MEDIA_BUCKET,
  publicUrl,
  describeError,
  marketingReadiness,
} from "../_lib/marketing";
import SetupNotice from "../_lib/SetupNotice";
import { saveWorkshop, deleteWorkshop } from "./actions";
import type { WorkshopModule, WorkshopRow } from "./types";
import WorkshopManager from "./WorkshopManager.client";

/**
 * Website → Workshops.
 *
 * Authors marketing.workshops, the catalogue at /workshops. Note there is no
 * session scheduling here: workshops are booked per client rather than run to a
 * public calendar, so the site never advertises dates.
 */

const REVALIDATE_PATH = "/website/workshops";

async function getWorkshops(): Promise<WorkshopRow[]> {
  const db = await marketing();
  const { data, error } = await db
    .from("workshops")
    .select("*")
    .order("display_order")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Failed to fetch workshops:`, describeError(error));
    return [];
  }

  return (data ?? []).map((w: any) => ({
    id: w.id,
    slug: w.slug ?? "",
    title: w.title ?? "",
    summary: w.summary ?? "",
    description: w.description ?? "",
    format: w.format ?? "onsite",
    durationMinutes: w.duration_minutes ?? 120,
    audience: w.audience,
    outcomes: w.outcomes ?? [],
    modules: Array.isArray(w.modules) ? w.modules : [],
    minParticipants: w.min_participants,
    maxParticipants: w.max_participants,
    coverUrl: publicUrl(MEDIA_BUCKET, w.cover_url),
    coverPath: w.cover_url ?? null,
    isFeatured: !!w.is_featured,
    displayOrder: w.display_order ?? 0,
    status: w.status,
    publishedAt: w.published_at,
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

  const workshops = await getWorkshops();
  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Workshops</h2>
        <p className="mt-1 text-sm text-gray-500">
          The catalogue at /workshops. There is no schedule to manage —
          workshops are arranged per client, and the site says so rather than
          advertising dates.
        </p>
      </div>
      <WorkshopManager
        workshops={workshops}
        saveWorkshop={saveWorkshop}
        deleteWorkshop={deleteWorkshop}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-lg text-gray-600">Loading workshops…</p>
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
