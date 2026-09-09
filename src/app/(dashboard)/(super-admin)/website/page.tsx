import { Suspense } from "react";
import Link from "next/link";
import { FileText, Mic, GraduationCap, Images, Inbox, Gauge } from "lucide-react";
import { marketing, describeError, marketingReadiness } from "./_lib/marketing";
import SetupNotice from "./_lib/SetupNotice";

/**
 * Website → Overview.
 *
 * A read-only picture of what is published and what is waiting. Counts are
 * fetched with head:true so the database returns a count without shipping the
 * rows — this page never needs the content itself.
 */

type Tile = {
  href: string;
  label: string;
  icon: typeof FileText;
  total: number;
  published: number | null;
  note: string;
};

async function countRows(
  table: string,
  filter?: { column: string; value: string },
): Promise<number> {
  const db = await marketing();
  let query = db.from(table).select("*", { count: "exact", head: true });
  if (filter) query = query.eq(filter.column, filter.value);

  const { count, error } = await query;
  if (error) {
    // error.message alone is empty on a head:true request — HEAD responses have
    // no body for supabase-js to parse the PostgREST payload out of, which is
    // why these were logging as `failed: ""`. describeError keeps the code and
    // hint, which is where the actual diagnosis lives.
    console.error(`count(${table}) failed:`, describeError(error));
    return 0;
  }
  return count ?? 0;
}

async function Content() {
  // Probe once. Without it, six counts each fail separately and the dashboard
  // shows a wall of zeroes that reads as "no content" rather than "not set up".
  const readiness = await marketingReadiness();
  if (!readiness.ok) return <SetupNotice readiness={readiness} />;

  const [
    posts, postsLive,
    episodes, episodesLive,
    workshops, workshopsLive,
    albums, albumsLive,
    leads, newLeads,
    assessments,
  ] = await Promise.all([
    countRows("posts"), countRows("posts", { column: "status", value: "published" }),
    countRows("podcast_episodes"), countRows("podcast_episodes", { column: "status", value: "published" }),
    countRows("workshops"), countRows("workshops", { column: "status", value: "published" }),
    countRows("gallery_albums"), countRows("gallery_albums", { column: "status", value: "published" }),
    countRows("leads"), countRows("leads", { column: "status", value: "new" }),
    countRows("assessments"),
  ]);

  const tiles: Tile[] = [
    { href: "/website/blogs", label: "Articles", icon: FileText, total: posts, published: postsLive, note: "on /resources/blog" },
    { href: "/website/podcasts", label: "Episodes", icon: Mic, total: episodes, published: episodesLive, note: "on /resources/podcast" },
    { href: "/website/workshops", label: "Workshops", icon: GraduationCap, total: workshops, published: workshopsLive, note: "on /workshops" },
    { href: "/website/gallery", label: "Gallery albums", icon: Images, total: albums, published: albumsLive, note: "on /gallery" },
    { href: "/website/leads", label: "Leads", icon: Inbox, total: leads, published: null, note: `${newLeads} still marked new` },
    { href: "/website/assessments", label: "Secure Score", icon: Gauge, total: assessments, published: null, note: "self-assessment submissions" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gray-100 text-gray-700 group-hover:bg-brand-blue group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-2xl font-bold text-gray-900">
                  {tile.total}
                </span>
              </div>
              <p className="mt-3 font-semibold text-gray-900">{tile.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {tile.published !== null
                  ? `${tile.published} published · ${tile.note}`
                  : tile.note}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-bold text-gray-900">How publishing works</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-gray-600">
          <li>
            Everything is created as a <strong>draft</strong> and stays invisible
            to visitors until its status is set to Published.
          </li>
          <li>
            The public site reads these tables with a read-only key and can only
            see published rows — an unfinished draft cannot leak.
          </li>
          <li>
            Enquiries email the team automatically as they arrive. The Leads
            screen is where they get worked, not where you find out about them.
          </li>
          <li>
            Workshops have no schedule to manage. They are arranged per client,
            and the site says so rather than advertising dates.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-lg text-gray-600">Loading overview…</p>
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
