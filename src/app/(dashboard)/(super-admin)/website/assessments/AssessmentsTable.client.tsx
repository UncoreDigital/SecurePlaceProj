"use client";

import { Fragment, useMemo, useState } from "react";
import type { AssessmentRow } from "./page";

type Props = {
  assessments: AssessmentRow[];
  median: number | null;
  sampleSize: number;
};

const BAND_LABELS: Record<string, string> = {
  certification_ready: "Certification ready",
  certifiable: "Certifiable",
  developing: "Developing",
  at_risk: "At risk",
};

const BAND_CLASS: Record<string, string> = {
  certification_ready: "bg-green-100 text-green-700",
  certifiable: "bg-green-100 text-green-700",
  developing: "bg-amber-100 text-amber-700",
  at_risk: "bg-red-100 text-red-700",
};

const PILLAR_LABELS: Record<string, string> = {
  emergency: "Emergency preparedness",
  reporting: "Speak-up & reporting",
  training: "Training & awareness",
  drills: "Drills & readiness",
  compliance: "Compliance & governance",
};

function scoreColour(score: number) {
  if (score >= 70) return "text-green-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

export default function AssessmentsTable({ assessments, median, sampleSize }: Props) {
  const [band, setBand] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(
    () => (band === "all" ? assessments : assessments.filter((a) => a.band === band)),
    [assessments, band],
  );

  const withContact = assessments.filter((a) => a.leadEmail).length;

  function exportCsv() {
    const headers = [
      "Company", "Industry", "Workforce", "Sites", "Score", "Band",
      "Emergency", "Reporting", "Training", "Drills", "Compliance",
      "Contact", "Email", "Submitted",
    ];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const rows = filtered.map((a) =>
      [
        a.company, a.industry, a.employeeBand, a.siteCount, a.totalScore,
        BAND_LABELS[a.band] ?? a.band,
        a.pillarScores.emergency, a.pillarScores.reporting, a.pillarScores.training,
        a.pillarScores.drills, a.pillarScores.compliance,
        a.leadName, a.leadEmail, a.createdAt?.slice(0, 10),
      ].map(escape).join(","),
    );

    const blob = new Blob(["﻿" + [headers.map(escape).join(","), ...rows].join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `secure-score-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Submissions" value={String(assessments.length)} />
        <Stat
          label="Median score"
          value={median === null ? "—" : `${median}`}
          note={
            sampleSize < 20
              ? `only ${sampleSize} submission${sampleSize === 1 ? "" : "s"} — too few to publish as a benchmark`
              : `across ${sampleSize} submissions`
          }
        />
        <Stat
          label="With contact details"
          value={`${withContact}`}
          note={`${assessments.length - withContact} did not complete the email step`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={band}
          onChange={(e) => setBand(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All bands</option>
          {Object.entries(BAND_LABELS).map(([k, v]) => (
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
          <p className="font-semibold text-gray-700">No submissions yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Results from /secure-score will appear here as people complete it.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Band</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {a.company || "— not given —"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {[a.industry, a.employeeBand && `${a.employeeBand} staff`, a.siteCount && `${a.siteCount} sites`]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-lg font-bold ${scoreColour(a.totalScore)}`}>
                        {a.totalScore}
                      </span>
                      <span className="text-xs text-gray-400">/100</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          BAND_CLASS[a.band] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {BAND_LABELS[a.band] ?? a.band}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.leadEmail ? (
                        <>
                          <div className="text-gray-700">{a.leadName}</div>
                          <a
                            href={`mailto:${a.leadEmail}`}
                            className="text-xs text-brand-blue hover:underline"
                          >
                            {a.leadEmail}
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">
                          did not complete the email step
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.createdAt?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpen(open === a.id ? null : a.id)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                      >
                        {open === a.id ? "Hide" : "Breakdown"}
                      </button>
                    </td>
                  </tr>

                  {open === a.id && (
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <td colSpan={6} className="px-4 py-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Pillar scores · engine {a.engineVersion}
                        </p>
                        <div className="flex flex-col gap-2">
                          {Object.entries(PILLAR_LABELS).map(([key, name]) => {
                            const value = a.pillarScores[key] ?? 0;
                            return (
                              <div
                                key={key}
                                className="grid grid-cols-[minmax(0,12rem)_1fr_3rem] items-center gap-3"
                              >
                                <span className="text-sm text-gray-700">{name}</span>
                                <div className="h-2 rounded bg-gray-200">
                                  <div
                                    className="h-2 rounded bg-brand-blue"
                                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                                  />
                                </div>
                                <span className="text-right font-mono text-sm font-semibold text-gray-900">
                                  {value}
                                </span>
                              </div>
                            );
                          })}
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
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-gray-900">{value}</p>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  );
}
