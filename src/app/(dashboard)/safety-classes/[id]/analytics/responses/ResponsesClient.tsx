"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Eye, CircleCheckBig, CircleX, X,
  RefreshCw, Check, Search, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 10;

interface Firm { id: string; name: string }

interface Submission {
  id: string;
  employeeName: string;
  employeeEmail: string | null;
  score: number;
  passed: boolean;
  marksObtained: number | null;
  totalMarks: number | null;
  submittedAt: string;
  firmName: string;
}

interface ResponseDetail {
  id: string;
  employeeName: string;
  employeeEmail: string | null;
  score: number;
  passed: boolean;
  marksObtained: number;
  totalMarks: number;
  submittedAt: string;
  firmName: string;
  questions: {
    questionId: string;
    questionText: string;
    marks: number;
    selectedOptionId: string | null;
    isCorrectAnswer: boolean;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
      isSelected: boolean;
    }[];
  }[];
}

interface ResponsesClientProps {
  formId: string;
  safetyClassId: string;
  safetyClassTitle: string;
  isSuperAdmin: boolean;
  defaultFirmId?: string;
  /** If set, all queries are locked to this location_id (location_admin). */
  defaultLocationId?: string;
  firms: Firm[];
}

export default function ResponsesClient({
  formId,
  safetyClassId,
  safetyClassTitle,
  isSuperAdmin,
  defaultFirmId,
  defaultLocationId,
  firms,
}: ResponsesClientProps) {
  const router = useRouter();

  const [firmId, setFirmId] = useState<string>(defaultFirmId ?? "all");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [detailSub, setDetailSub] = useState<ResponseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter(
      (s) =>
        s.employeeName.toLowerCase().includes(q) ||
        (s.employeeEmail ?? "").toLowerCase().includes(q) ||
        s.firmName.toLowerCase().includes(q)
    );
  }, [submissions, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedSubmissions = filteredSubmissions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleFirmChange = (v: string) => { setFirmId(v); setPage(1); };

  const fetchResponses = async (fid?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`/api/forms/${formId}/analytics`, window.location.origin);
      const effective = !isSuperAdmin ? defaultFirmId : fid;
      if (effective && effective !== "all") url.searchParams.set("firmId", effective);
      // location_admin: scope to their assigned location
      if (defaultLocationId) url.searchParams.set("locationId", defaultLocationId);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load responses"); return; }
      setSubmissions(data.submissions ?? []);
      setPage(1);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses(firmId === "all" ? undefined : firmId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, firmId]);

  const openDetail = async (sub: Submission) => {
    setDetailSub(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/forms/${formId}/responses/${sub.id}`);
      const data = await res.json();
      if (!res.ok) { setDetailError(data.error ?? "Failed to load response"); return; }
      setDetailSub(data);
    } catch {
      setDetailError("Network error.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setDetailSub(null); setDetailError(null); };

  const pdfRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (exporting || submissions.length === 0) return;
    setExporting(true);
    setIsPrinting(true);

    // Let React re-render with all rows visible (isPrinting => filteredSubmissions)
    await new Promise((r) => setTimeout(r, 250));

    if (!pdfRef.current) {
      setIsPrinting(false);
      setExporting(false);
      return;
    }

    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const target = pdfRef.current;
      const PIXEL_RATIO = 2;

      void target.getBoundingClientRect();
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );

      const imgData = await toPng(target, {
        pixelRatio: PIXEL_RATIO,
        backgroundColor: "#ffffff",
      });

      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = imgData;
      });

      // A4 landscape with padding on every side.
      const PAGE_W = 297;
      const PAGE_H = 210;
      const PADDING = 10;
      const usableW = PAGE_W - PADDING * 2;
      const usableH = PAGE_H - PADDING * 2;

      // Scale the captured image proportionally so its width fits the page.
      const PX_TO_MM = 25.4 / 96;
      const fullWmm = (img.naturalWidth / PIXEL_RATIO) * PX_TO_MM;
      const fullHmm = (img.naturalHeight / PIXEL_RATIO) * PX_TO_MM;
      const scale = usableW / fullWmm;
      const scaledFullH = fullHmm * scale;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      if (scaledFullH <= usableH) {
        // Whole table fits on one page
        doc.addImage(imgData, "PNG", PADDING, PADDING, usableW, scaledFullH);
      } else {
        // Slice the tall image into page-sized chunks; only emit a page
        // when there is actual content for it (no trailing blank page).
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");

        const slicePxPerPage = (usableH / scale / PX_TO_MM) * PIXEL_RATIO;
        const totalPages = Math.ceil(img.naturalHeight / slicePxPerPage);

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) doc.addPage();
          const srcY = i * slicePxPerPage;
          const slicePx = Math.min(slicePxPerPage, img.naturalHeight - srcY);

          canvas.width = img.naturalWidth;
          canvas.height = slicePx;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            0, srcY, img.naturalWidth, slicePx,
            0, 0, img.naturalWidth, slicePx
          );
          const sliceData = canvas.toDataURL("image/png");
          const sliceHmm = (slicePx / PIXEL_RATIO) * PX_TO_MM * scale;
          doc.addImage(sliceData, "PNG", PADDING, PADDING, usableW, sliceHmm);
        }
      }

      doc.save(`responses-${safetyClassTitle.replace(/\s+/g, "-")}.pdf`);
    } finally {
      setIsPrinting(false);
      setExporting(false);
    }
  };

  const displayedSubmissions = isPrinting ? filteredSubmissions : pagedSubmissions;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <button
            onClick={() => router.push(`/safety-classes/${safetyClassId}/analytics`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Analytics
          </button>
          <h1 className="text-2xl font-bold text-brand-blue">All Responses</h1>
          <p className="text-gray-500 text-sm mt-0.5">{safetyClassTitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && firms.length > 0 && (
            <Select value={firmId} onValueChange={handleFirmChange}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {firms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchResponses(firmId === "all" ? undefined : firmId)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exporting || submissions.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            {exporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Search bar */}
      {!loading && submissions.length > 0 && (
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-4"
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
            <p className="text-gray-500 text-sm">Loading responses...</p>
          </div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Responses Yet</h3>
          <p className="text-gray-500 text-sm">
            No submissions found{firmId !== "all" ? " for this company" : ""}.
          </p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No responses match "{search}"</p>
          <button onClick={() => handleSearch("")} className="text-brand-blue text-sm mt-2 hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <>
          <div ref={pdfRef} className="bg-white">
          <Card className="mb-4">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600">#</th>
                      <th className="text-left p-3 font-medium text-gray-600">Name</th>
                      <th className="text-left p-3 font-medium text-gray-600">Email</th>
                      {isSuperAdmin && (
                        <th className="text-left p-3 font-medium text-gray-600">Company</th>
                      )}
                      <th className="text-center p-3 font-medium text-gray-600">Marks</th>
                      <th className="text-center p-3 font-medium text-gray-600">Score</th>
                      <th className="text-center p-3 font-medium text-gray-600">Result</th>
                      <th className="text-left p-3 font-medium text-gray-600">Submitted</th>
                      <th className="text-center p-3 font-medium text-gray-600">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedSubmissions.map((sub, i) => (
                      <tr key={sub.id} className={i % 2 === 0 ? "" : "bg-gray-50/50"}>
                        <td className="p-3 text-gray-400 text-xs">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="p-3 font-medium text-gray-800">{sub.employeeName}</td>
                        <td className="p-3 text-gray-500">{sub.employeeEmail || "—"}</td>
                        {isSuperAdmin && (
                          <td className="p-3 text-gray-500">{sub.firmName}</td>
                        )}
                        <td className="p-3 text-center text-gray-600 text-xs">
                          {sub.marksObtained != null ? `${sub.marksObtained} / ${sub.totalMarks}` : "—"}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-800">{sub.score}%</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                            sub.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}>
                            {sub.passed ? "Passed" : "Failed"}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 text-xs">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetail(sub)}
                            className="h-8 w-8 p-0 text-brand-blue hover:bg-blue-50"
                            title="View full response"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>{/* end pdfRef */}

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredSubmissions.length)} of {filteredSubmissions.length}
              {search && ` (filtered from ${submissions.length})`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <Button
                      key={p}
                      size="sm"
                      variant={safePage === p ? "default" : "outline"}
                      onClick={() => setPage(p as number)}
                      className={`h-8 w-8 p-0 ${safePage === p ? "bg-brand-blue hover:bg-brand-blue/90" : ""}`}
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Response Detail Modal */}
      {(detailLoading || detailSub || detailError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Response Detail</h2>
                {detailSub && (
                  <p className="text-sm text-gray-500 mt-0.5">{detailSub.employeeName}</p>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-5">
              {detailLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
                  <p className="text-gray-500 text-sm">Loading response...</p>
                </div>
              )}

              {detailError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {detailError}
                </div>
              )}

              {detailSub && (
                <div className="space-y-4">
                  {/* Score summary */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    {detailSub.passed ? (
                      <CircleCheckBig className="h-10 w-10 text-green-500 flex-shrink-0" />
                    ) : (
                      <CircleX className="h-10 w-10 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`text-2xl font-extrabold ${detailSub.passed ? "text-green-700" : "text-red-600"}`}>
                        {detailSub.score}%
                      </p>
                      <p className="text-sm text-gray-500">
                        {detailSub.marksObtained} / {detailSub.totalMarks} marks &bull;{" "}
                        <span className={detailSub.passed ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                          {detailSub.passed ? "Passed" : "Failed"}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(detailSub.submittedAt).toLocaleString()}
                        {isSuperAdmin && ` · ${detailSub.firmName}`}
                      </p>
                    </div>
                  </div>

                  {/* Questions */}
                  {detailSub.questions.map((q, qi) => (
                    <div key={q.questionId} className="border rounded-lg overflow-hidden">
                      <div className={`px-4 py-2.5 flex items-start justify-between gap-3 ${
                        q.isCorrectAnswer ? "bg-green-50 border-b border-green-100" : "bg-red-50 border-b border-red-100"
                      }`}>
                        <p className="text-sm font-medium text-gray-800">
                          <span className="text-brand-blue font-bold mr-1.5">{qi + 1}.</span>
                          {q.questionText}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-gray-400">{q.marks} {q.marks === 1 ? "mark" : "marks"}</span>
                          {q.isCorrectAnswer ? (
                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">+{q.marks}</span>
                          ) : (
                            <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">0</span>
                          )}
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {q.options.map((opt) => {
                          const isSelected = opt.isSelected;
                          const isCorrect = opt.isCorrect;

                          let cls = "border-gray-200 text-gray-600 bg-white";
                          if (isCorrect && isSelected) cls = "border-green-400 bg-green-50 text-green-800";
                          else if (isCorrect && !isSelected) cls = "border-green-300 bg-green-50/60 text-green-700";
                          else if (!isCorrect && isSelected) cls = "border-red-400 bg-red-50 text-red-700";

                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-md border text-sm ${cls}`}
                            >
                              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isCorrect
                                  ? "border-green-500 bg-green-500"
                                  : isSelected
                                    ? "border-red-400 bg-red-400"
                                    : "border-gray-300"
                              }`}>
                                {isCorrect && <Check className="h-2.5 w-2.5 text-white" />}
                              </div>
                              <span className="flex-1">{opt.text}</span>
                              {isSelected && !isCorrect && (
                                <span className="text-xs text-red-500 font-medium">Your answer</span>
                              )}
                              {isSelected && isCorrect && (
                                <span className="text-xs text-green-600 font-medium">Your answer ✓</span>
                              )}
                              {!isSelected && isCorrect && (
                                <span className="text-xs text-green-600 font-medium">Correct answer</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
