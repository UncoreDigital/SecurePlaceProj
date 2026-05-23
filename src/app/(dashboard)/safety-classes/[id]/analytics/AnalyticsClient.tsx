"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  CircleCheckBig,
  CircleX,
  TrendingUp,
  ChartNoAxesColumn,
  RefreshCw,
  Trophy,
  Eye,
  Pencil,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Firm {
  id: string;
  name: string;
}

interface AnalyticsClientProps {
  formId: string;
  safetyClassId: string;
  safetyClassTitle: string;
  firms: Firm[];
  isSuperAdmin: boolean;
  defaultFirmId?: string;
  /** If set, all analytics queries are locked to this location_id (location_admin). */
  defaultLocationId?: string;
}

interface OptionStat {
  id: string;
  text: string;
  isCorrect: boolean;
  count: number;
  percentage: number;
}

interface QuestionStat {
  questionId: string;
  questionText: string;
  marks: number;
  totalAnswered: number;
  correctCount: number;
  incorrectCount: number;
  options: OptionStat[];
}

interface Analytics {
  formId: string;
  formTitle: string;
  passScore: number;
  totalSubmissions: number;
  totalPassed: number;
  totalFailed: number;
  avgScore: number;
  passRate: number;
  questionStats: QuestionStat[];
  submissions: any[];
}

export default function AnalyticsClient({
  formId,
  safetyClassId,
  safetyClassTitle,
  firms,
  isSuperAdmin,
  defaultFirmId,
  defaultLocationId,
}: AnalyticsClientProps) {
  const router = useRouter();
  // firm_admin: always locked to their firm; super_admin: filterable
  const [firmId, setFirmId] = useState<string>(defaultFirmId ?? "all");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<"responses" | "edit" | null>(null);

  const fetchAnalytics = async (fid?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`/api/forms/${formId}/analytics`, window.location.origin);
      // firm_admin / location_admin: always filter by their firm
      const effectiveFirmId = !isSuperAdmin ? defaultFirmId : fid;
      if (effectiveFirmId && effectiveFirmId !== "all") {
        url.searchParams.set("firmId", effectiveFirmId);
      }
      // location_admin: also pin to their assigned location
      if (defaultLocationId) {
        url.searchParams.set("locationId", defaultLocationId);
      }
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load analytics");
        return;
      }
      setAnalytics(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(firmId === "all" ? undefined : firmId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, firmId]);

  // ── Computed achievement stats ─────────────────────────────
  const achievers100 = analytics?.submissions.filter((s) => s.score === 100).length ?? 0;
  const achievers75 = analytics?.submissions.filter((s) => s.score >= 75).length ?? 0;
  const achievers50 = analytics?.submissions.filter((s) => s.score >= 50).length ?? 0;

  const pdfRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!pdfRef.current || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const target = pdfRef.current;
      const PIXEL_RATIO = 2;

      // Force layout pass so dimensions are stable before capture
      void target.getBoundingClientRect();
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );

      // Capture exactly what's on screen — no widening, no width overrides.
      // The previous attempts to widen the element were defeated by parent
      // layout constraints, causing the captured image's content to not
      // align with the PDF page dimensions. Capturing as-is removes that
      // entire class of mismatch.
      const imgData = await toPng(target, {
        pixelRatio: PIXEL_RATIO,
        backgroundColor: "#ffffff",
      });

      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = imgData;
      });

      // PDF page = image size (in mm at 96 DPI) + even padding on all sides.
      const PX_TO_MM = 25.4 / 96;
      const PADDING_MM = 10;
      const cssWidth = img.naturalWidth / PIXEL_RATIO;
      const cssHeight = img.naturalHeight / PIXEL_RATIO;
      const imgW = cssWidth * PX_TO_MM;
      const imgH = cssHeight * PX_TO_MM;
      const pdfW = imgW + PADDING_MM * 2;
      const pdfH = imgH + PADDING_MM * 2;

      const doc = new jsPDF({
        orientation: pdfW > pdfH ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfW, pdfH],
      });
      doc.addImage(imgData, "PNG", PADDING_MM, PADDING_MM, imgW, imgH);
      doc.save(`analytics-${safetyClassTitle.replace(/\s+/g, "-")}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <button
            onClick={() => router.push(`/form-management`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Forms
          </button>
          <h1 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
            <ChartNoAxesColumn className="h-6 w-6" /> Form Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{safetyClassTitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Firm filter — super_admin only */}
          {isSuperAdmin && firms.length > 0 && (
            <Select value={firmId} onValueChange={setFirmId}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {firms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(firmId === "all" ? undefined : firmId)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={navigatingTo !== null}
            onClick={() => {
              setNavigatingTo("responses");
              const url = `/safety-classes/${safetyClassId}/analytics/responses${firmId && firmId !== "all" ? `?firmId=${firmId}` : ""}`;
              router.push(url);
            }}
            className="disabled:opacity-60 disabled:cursor-wait"
          >
            {navigatingTo === "responses" ? (
              <div className="animate-spin h-4 w-4 mr-1.5 border-2 border-brand-blue border-t-transparent rounded-full" />
            ) : (
              <Eye className="h-4 w-4 mr-1.5" />
            )}
            View Responses
          </Button>

          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              disabled={navigatingTo !== null}
              onClick={() => {
                setNavigatingTo("edit");
                router.push(`/safety-classes/${safetyClassId}/form-builder`);
              }}
              className="disabled:opacity-60 disabled:cursor-wait"
            >
              {navigatingTo === "edit" ? (
                <div className="animate-spin h-4 w-4 mr-1.5 border-2 border-brand-blue border-t-transparent rounded-full" />
              ) : (
                <Pencil className="h-4 w-4 mr-1.5" />
              )}
              Edit Form
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            disabled={exporting || !analytics}
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

      {/* pdfRef captures only the data content, not the action buttons */}
      <div ref={pdfRef} className="bg-white">

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
            <p className="text-gray-500 text-sm">Loading analytics...</p>
          </div>
        </div>
      ) : analytics && analytics.totalSubmissions === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Submissions Yet</h3>
          <p className="text-gray-500 text-sm">
            Share the form link with employees so they can fill the assessment.
          </p>
        </div>
      ) : analytics ? (
        <div className="space-y-6">

          {/* ── Achievement Cards ─────────────────────────── */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Score Achievements
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-5 pb-5 text-center">
                  <Trophy className="h-7 w-7 text-yellow-500 mx-auto mb-2" />
                  <p className="text-3xl font-extrabold text-yellow-600">{achievers100}</p>
                  <p className="text-sm font-medium text-yellow-700 mt-0.5">Scored 100%</p>
                  <p className="text-xs text-yellow-500 mt-0.5">Perfect score</p>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-5 pb-5 text-center">
                  <CircleCheckBig className="h-7 w-7 text-green-500 mx-auto mb-2" />
                  <p className="text-3xl font-extrabold text-green-600">{achievers75}</p>
                  <p className="text-sm font-medium text-green-700 mt-0.5">Scored 75%+</p>
                  <p className="text-xs text-green-500 mt-0.5">Strong pass</p>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-5 pb-5 text-center">
                  <TrendingUp className="h-7 w-7 text-blue-500 mx-auto mb-2" />
                  <p className="text-3xl font-extrabold text-blue-600">{achievers50}</p>
                  <p className="text-sm font-medium text-blue-700 mt-0.5">Scored 50%+</p>
                  <p className="text-xs text-blue-500 mt-0.5">Passing range</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Summary Stat Cards ───────────────────────── */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Overall Summary
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Responses</p>
                      <p className="text-2xl font-bold text-gray-800">{analytics.totalSubmissions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50">
                      <CircleCheckBig className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Passed</p>
                      <p className="text-2xl font-bold text-green-700">
                        {analytics.totalPassed}
                        <span className="text-sm font-normal text-gray-400 ml-1">
                          ({analytics.passRate}%)
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-50">
                      <CircleX className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Failed</p>
                      <p className="text-2xl font-bold text-red-600">{analytics.totalFailed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Question-wise Analysis ───────────────────── */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Question-wise Analysis
            </h2>
            <div className="space-y-3">
              {analytics.questionStats.map((qs, qi) => {
                const correctPct =
                  qs.totalAnswered > 0
                    ? Math.round((qs.correctCount / analytics.totalSubmissions) * 100)
                    : 0;
                const isEasy = correctPct >= 70;
                const isMedium = correctPct >= 40 && correctPct < 70;

                return (
                  <Card key={qs.questionId}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="text-sm font-medium text-gray-800 flex-1">
                          <span className="text-brand-blue font-bold mr-1.5">{qi + 1}.</span>
                          {qs.questionText}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                          <span className="text-gray-400">{qs.marks} {qs.marks === 1 ? "mark" : "marks"}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold ${
                              isEasy
                                ? "bg-green-100 text-green-700"
                                : isMedium
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {correctPct}% correct
                          </span>
                        </div>
                      </div>

                      {/* Simple progress bar */}
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isEasy ? "bg-green-400" : isMedium ? "bg-yellow-400" : "bg-red-400"
                          }`}
                          style={{ width: `${correctPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {qs.correctCount} of {analytics.totalSubmissions} respondents answered correctly
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

        </div>
      ) : null}

      </div>{/* end pdfRef */}
    </div>
  );
}
