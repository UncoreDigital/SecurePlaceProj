"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Mic,
  GraduationCap,
  Images,
  Inbox,
  Gauge,
} from "lucide-react";

const TABS = [
  { href: "/website", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/website/blogs", label: "Blog", icon: FileText },
  { href: "/website/podcasts", label: "Podcast", icon: Mic },
  { href: "/website/workshops", label: "Workshops", icon: GraduationCap },
  { href: "/website/gallery", label: "Gallery", icon: Images },
  { href: "/website/leads", label: "Leads", icon: Inbox },
  { href: "/website/assessments", label: "Secure Score", icon: Gauge },
];

export default function WebsiteTabs() {
  const pathname = usePathname();

  return (
    <div className="mt-5 border-b border-gray-200">
      {/* Horizontally scrollable so the tab row never wraps into two lines or
          pushes the page sideways on a narrow screen. */}
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Website sections">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
