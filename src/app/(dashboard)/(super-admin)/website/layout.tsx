import Link from "next/link";
import { SuperAdminGuard } from "@/components/AuthGuard";
import WebsiteTabs from "./WebsiteTabs.client";

/**
 * Website CMS section.
 *
 * Everything under /website authors content for the public marketing site
 * (secureplacetowork.com), which reads the marketing schema with the anon key.
 * Super admin only — firm and location admins manage their own organisation's
 * safety data and never publish to the public site.
 *
 * The guard is applied once here rather than repeated in every child page, so a
 * new screen added to this folder is protected by default rather than by
 * remembering to wrap it.
 */
export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminGuard>
      <div className="container mx-auto">
        <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/super-admin-dashboard" className="hover:text-gray-700">
            Home
          </Link>
          <span>&gt;</span>
          <span>Website</span>
        </nav>

        <h1 className="text-3xl font-bold text-brand-blue">Website</h1>
        <p className="mt-1 text-gray-500">
          Content for the public marketing site. Only published items are
          visible to visitors.
        </p>

        <WebsiteTabs />

        <div className="mt-6">{children}</div>
      </div>
    </SuperAdminGuard>
  );
}
