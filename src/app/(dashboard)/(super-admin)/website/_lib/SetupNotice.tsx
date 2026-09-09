// TriangleAlert, not AlertTriangle: next.config.ts rewrites lucide imports to
// lucide-react/dist/esm/icons/*, and that barrel exports only the canonical
// names. AlertTriangle is a legacy alias that exists solely on the package main
// entry, so it resolves under webpack but fails under Turbopack.
import { TriangleAlert, Database, KeyRound, Table2 } from "lucide-react";
import type { MarketingReadiness } from "./marketing";

/**
 * Shown in place of a CMS screen when the marketing schema is not reachable.
 *
 * The failure is always a setup step, never bad data, so this states which step
 * and gives the exact SQL — rather than leaving an empty table and a console
 * error for someone to interpret.
 */
export default function SetupNotice({ readiness }: { readiness: MarketingReadiness }) {
  if (readiness.ok) return null;

  const content = {
    "no-credentials": {
      icon: KeyRound,
      title: "Supabase credentials are missing",
      body: "This environment has no Supabase URL or anon key, so the website content cannot be loaded.",
      steps: [
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
        "Restart the dev server so Next.js picks them up",
      ],
      sqlLabel: null,
      sqlNote: null,
      sql: null,
    },
    "schema-not-exposed": {
      icon: Database,
      title: "The marketing schema is not exposed to the API",
      body: "The tables exist in Postgres, but PostgREST is only serving the public schema — so every request from this section is rejected before it reaches them.",
      steps: [
        "Open the Supabase Dashboard → Project Settings → API",
        'Find "Exposed schemas" and add marketing alongside public',
        "Save — the API reloads on its own, then refresh this page",
      ],
      sqlLabel: "Prefer SQL? This does the same thing",
      // Flagged as a fallback rather than an equal option on purpose. Supabase
      // manages the authenticator role's config, so a value set this way can be
      // overwritten the next time the platform pushes settings. The dashboard
      // setting is the durable one.
      sqlNote:
        "Supabase manages this role's settings, so a value set here can be reset later. The dashboard is the setting that sticks.",
      sql: `ALTER ROLE authenticator
  SET pgrst.db_schemas = 'public, graphql_public, marketing';

NOTIFY pgrst, 'reload config';`,
    },
    "tables-missing": {
      icon: Table2,
      title: "The marketing tables have not been created",
      body: "The schema is reachable but the tables are not there yet, so the migrations still need to run.",
      steps: [
        "Open the Supabase SQL Editor",
        "Run marketing-schema-migration.sql",
        "Then marketing-buckets-migration.sql and marketing-gallery-migration.sql",
        "Optionally marketing-seed.sql for sample content",
      ],
      sqlLabel: null,
      sqlNote: null,
      sql: null,
    },
    unknown: {
      icon: TriangleAlert,
      title: "Could not reach the website content",
      body: "The request to the marketing schema failed for a reason this screen does not recognise. The database response is shown below.",
      steps: ["Check the Supabase project is running and the keys are current"],
      sqlLabel: null,
      sqlNote: null,
      sql: null,
    },
  }[readiness.reason];

  const Icon = content.icon;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
      <div className="flex gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-amber-900">{content.title}</h3>
          <p className="mt-1 text-sm text-amber-800">{content.body}</p>

          <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-amber-900">
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {content.sql && (
            <div className="mt-5 border-t border-amber-300/60 pt-4">
              {content.sqlLabel && (
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  {content.sqlLabel}
                </p>
              )}
              <pre className="mt-2 overflow-x-auto rounded-lg bg-amber-900/90 p-4 text-xs leading-relaxed text-amber-50">
                {content.sql}
              </pre>
              {content.sqlNote && (
                <p className="mt-2 text-xs text-amber-800">{content.sqlNote}</p>
              )}
            </div>
          )}

          <p className="mt-4 font-mono text-xs text-amber-700">
            Database said: {readiness.detail}
          </p>
        </div>
      </div>
    </div>
  );
}
