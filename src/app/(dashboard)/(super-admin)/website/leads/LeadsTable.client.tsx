"use client";

import { Fragment, useMemo, useState } from "react";
import type { LeadRow } from "./types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { ActionResult } from "../_lib/marketing";

type Action = (fd: FormData) => Promise<ActionResult>;

type Props = {
  leads: LeadRow[];
  updateLead: Action;
  deleteLead: Action;
};

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

const SOURCE_LABELS: Record<string, string> = {
  contact: "Contact form",
  demo: "Demo request",
  secure_score: "Secure Score",
  guide_download: "Download",
  workshop: "Workshop",
  certification: "Certification",
  other: "Other",
};

const statusClass: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-purple-100 text-purple-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-gray-200 text-gray-600",
};

export default function LeadsTable({ leads, updateLead, deleteLead }: Props) {
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LeadRow | null>(null);
  const [actionError, setActionError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (source !== "all" && l.source !== source) return false;
      if (!q) return true;
      return [l.name, l.email, l.company, l.message]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [leads, status, source, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  /**
   * CSV is generated in the browser from the rows already on screen, so the
   * export always matches the filter the user is looking at. Values are quoted
   * and internal quotes doubled — a lead message containing a comma or a
   * newline would otherwise shift every following column.
   */
  function exportCsv() {
    const headers = [
      "Name", "Email", "Company", "Phone", "Job title",
      "Source", "Status", "Received", "Message", "Notes",
    ];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const rows = filtered.map((l) =>
      [
        l.name, l.email, l.company, l.phone, l.jobTitle,
        SOURCE_LABELS[l.source] ?? l.source, l.status,
        l.createdAt?.slice(0, 10), l.message, l.ownerNotes,
      ].map(escape).join(","),
    );

    const csv = [headers.map(escape).join(","), ...rows].join("\r\n");
    // BOM so Excel opens UTF-8 names and the ₹ symbol correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, company or message"
          className="min-w-[16rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All statuses ({counts.all ?? 0})</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s} ({counts[s] ?? 0})
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
        >
          Export CSV ({filtered.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold text-gray-700">
            {leads.length === 0 ? "No leads yet" : "Nothing matches those filters"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {leads.length === 0
              ? "Enquiries from the website will appear here."
              : "Try clearing the search or changing the status."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <Fragment key={lead.id}>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{lead.name}</div>
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-xs text-brand-blue hover:underline"
                      >
                        {lead.email}
                      </a>
                      {lead.company && (
                        <div className="text-xs text-gray-500">{lead.company}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {SOURCE_LABELS[lead.source] ?? lead.source}
                      {lead.sourceRef && (
                        <div className="font-mono text-xs text-gray-400">{lead.sourceRef}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          statusClass[lead.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {lead.createdAt?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setOpen(open === lead.id ? null : lead.id)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                        >
                          {open === lead.id ? "Close" : "Open"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(lead)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {open === lead.id && (
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              Message
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                              {lead.message || "— no message —"}
                            </p>
                            {(lead.phone || lead.jobTitle) && (
                              <p className="mt-3 text-xs text-gray-500">
                                {lead.jobTitle}
                                {lead.jobTitle && lead.phone ? " · " : ""}
                                {lead.phone}
                              </p>
                            )}
                          </div>

                          <form
                        action={async (fd) => {
                          const result = await updateLead(fd);
                          setActionError(result.ok ? "" : result.error);
                        }}
                        className="flex flex-col gap-3"
                      >
                            <input type="hidden" name="id" value={lead.id} />
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-600">
                                Status
                              </label>
                              <select
                                name="status"
                                defaultValue={lead.status}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-600">
                                Notes
                              </label>
                              <textarea
                                name="ownerNotes"
                                rows={3}
                                defaultValue={lead.ownerNotes ?? ""}
                                placeholder="What happened on the call, next step, who owns it"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              />
                            </div>
                            <button
                              type="submit"
                              className="self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
                            >
                              Save
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="Delete this enquiry?"
        description={
          <>
            <span className="font-medium text-gray-900">{pendingDelete?.name}</span>{" "}
            will be removed permanently. This cannot be undone.
          </>
        }
        confirmLabel="Delete enquiry"
        onConfirm={async () => {
          if (!pendingDelete) return;
          const fd = new FormData();
          fd.set("id", pendingDelete.id);
          const result = await deleteLead(fd);
          // Returning the message keeps the dialog open with the reason on it.
          if (!result.ok) return result.error;
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
