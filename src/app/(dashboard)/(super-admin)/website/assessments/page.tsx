import { Suspense } from "react";
import { marketing, describeError, marketingReadiness } from "../_lib/marketing";
import SetupNotice from "../_lib/SetupNotice";
import AssessmentsTable from "./AssessmentsTable.client";

/**
 * Website → Secure Score.
 *
 * Submissions from the free self-assessment at /secure-score. Read-only: these
 * are a record of what someone answered, and editing them would corrupt the
 * benchmark data the result screen draws on.
 */

export type AssessmentRow = {
  id: string;
  company: string | null;
  industry: string | null;
  employeeBand: string | null;
  siteCount: number | null;
  pillarScores: Record<string, number>;
  totalScore: number;
  band: string;
  engineVersion: string;
  createdAt: string;
  leadName: string | null;
  leadEmail: string | null;
};

async function getAssessments(): Promise<AssessmentRow[]> {
  const db = await marketing();
  const { data, error } = await db
    .from("assessments")
    .select("*, leads ( name, email )")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error(`Failed to fetch assessments:`, describeError(error));
    return [];
  }

  return (data ?? []).map((a: any) => ({
    id: a.id,
    company: a.company,
    industry: a.industry,
    employeeBand: a.employee_band,
    siteCount: a.site_count,
    pillarScores: a.pillar_scores ?? {},
    totalScore: a.total_score ?? 0,
    band: a.band ?? "at_risk",
    engineVersion: a.engine_version ?? "v1",
    createdAt: a.created_at,
    leadName: a.leads?.name ?? null,
    leadEmail: a.leads?.email ?? null,
  }));
}

async function Content() {
  // One probe for the whole section: if the schema is unreachable every
  // screen fails identically, so say so once instead of rendering an
  // empty table that looks like "no content yet".
  const readiness = await marketingReadiness();
  if (!readiness.ok) return <SetupNotice readiness={readiness} />;

  const assessments = await getAssessments();

  // Benchmarks are only meaningful with volume behind them, so the median is
  // computed here and the sample size shown alongside it rather than presenting
  // a figure drawn from three submissions as if it meant something.
  const scores = assessments.map((a) => a.totalScore).sort((x, y) => x - y);
  const median =
    scores.length === 0
      ? null
      : scores.length % 2
        ? scores[(scores.length - 1) / 2]
        : Math.round((scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2);

  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Secure Score submissions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Answers people gave in the free self-assessment. Read-only — these
          feed the industry benchmark, so they are kept exactly as submitted.
        </p>
      </div>
      <AssessmentsTable
        assessments={assessments}
        median={median}
        sampleSize={scores.length}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-lg text-gray-600">Loading submissions…</p>
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
