"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, ChevronLeft, Copy, ExternalLink, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Location {
  id: string;
  name: string;
}
interface Firm {
  id: string;
  name: string;
  locations: Location[];
}

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_text: string;
  marks: number;
  options: Option[];
}

interface FormBuilderClientProps {
  safetyClassId: string;
  safetyClassTitle: string;
  firms: Firm[];
  existingForm: any | null;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function emptyOption(): Option {
  return { id: uid(), option_text: "", is_correct: false };
}

function emptyQuestion(): Question {
  return {
    id: uid(),
    question_text: "",
    marks: 1,
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
  };
}

export default function FormBuilderClient({
  safetyClassId,
  safetyClassTitle,
  firms,
  existingForm,
}: FormBuilderClientProps) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [publishedFormId, setPublishedFormId] = useState<string | null>(existingForm?.id ?? null);
  // Key: `${firmId}:${locationId}` so each per-location button has its own state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [title, setTitle] = useState(existingForm?.title ?? safetyClassTitle);
  const [description, setDescription] = useState(existingForm?.description ?? "");
  const [passScore, setPassScore] = useState<number>(existingForm?.pass_score ?? 70);

  const [questions, setQuestions] = useState<Question[]>(() => {
    if (existingForm?.form_questions?.length) {
      return existingForm.form_questions
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((q: any) => ({
          id: uid(),
          question_text: q.question_text,
          marks: q.marks ?? 1,
          options: (q.form_question_options ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((o: any) => ({
              id: uid(),
              option_text: o.option_text,
              is_correct: o.is_correct,
            })),
        }));
    }
    return [emptyQuestion()];
  });

  // ---- Question helpers ----
  const addQuestion = () => setQuestions((p) => [...p, emptyQuestion()]);

  const removeQuestion = (qi: number) =>
    setQuestions((p) => p.filter((_, i) => i !== qi));

  const updateQuestion = (qi: number, text: string) =>
    setQuestions((p) => p.map((q, i) => (i === qi ? { ...q, question_text: text } : q)));

  const addOption = (qi: number) =>
    setQuestions((p) =>
      p.map((q, i) => (i === qi ? { ...q, options: [...q.options, emptyOption()] } : q))
    );

  const removeOption = (qi: number, oi: number) =>
    setQuestions((p) =>
      p.map((q, i) =>
        i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q
      )
    );

  const updateOption = (qi: number, oi: number, text: string) =>
    setQuestions((p) =>
      p.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, option_text: text } : o)) }
          : q
      )
    );

  const updateMarks = (qi: number, marks: number) =>
    setQuestions((p) =>
      p.map((q, i) => (i === qi ? { ...q, marks: Math.max(1, marks) } : q))
    );

  const setCorrectOption = (qi: number, oi: number) =>
    setQuestions((p) =>
      p.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => ({ ...o, is_correct: j === oi })) }
          : q
      )
    );

  // ---- Validation ----
  const validate = (): string | null => {
    if (!title.trim()) return "Form title is required";
    if (passScore < 1 || passScore > 100) return "Pass score must be between 1 and 100";
    if (questions.length === 0) return "Add at least one question";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) return `Question ${i + 1} text is required`;
      if (q.options.length < 2) return `Question ${i + 1} needs at least 2 options`;
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].option_text.trim())
          return `Question ${i + 1}, option ${j + 1} text is required`;
      }
      if (!q.options.some((o) => o.is_correct))
        return `Question ${i + 1} must have a correct answer selected`;
    }
    return null;
  };

  // ---- Save ----
  const handleSave = async () => {
    setError(null);
    setSaved(false);
    const err = validate();
    if (err) { setError(err); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safetyClassId,
          title: title.trim(),
          description: description.trim() || null,
          passScore,
          questions: questions.map((q) => ({
            question_text: q.question_text,
            marks: q.marks,
            options: q.options.map((o) => ({
              option_text: o.option_text,
              is_correct: o.is_correct,
            })),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save form");
        return;
      }
      setPublishedFormId(data.id);
      setSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPublicLink = (firmId: string, locationId: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/form/${publishedFormId}?firmId=${firmId}&locationId=${locationId}`;
  };

  const copyLink = async (firmId: string, locationId: string) => {
    const key = `${firmId}:${locationId}`;
    await navigator.clipboard.writeText(getPublicLink(firmId, locationId));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  const isEditing = !!existingForm;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/form-management")}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Forms
        </button>
        <h1 className="text-2xl font-bold text-brand-blue">
          {isEditing ? "Edit Form" : "Create Form"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Class: {safetyClassTitle}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <CircleAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Form Details */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Form Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="form-title">Form Title *</Label>
              <Input
                id="form-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fire Safety Assessment"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pass-score">Pass Score (%) *</Label>
              <Input
                id="pass-score"
                type="number"
                min={1}
                max={100}
                value={passScore}
                onChange={(e) => setPassScore(parseInt(e.target.value) || 70)}
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="form-desc">Description (optional)</Label>
            <Textarea
              id="form-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief instructions for the employee..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Questions ({questions.length}) &nbsp;·&nbsp; {totalMarks} total marks
          </h2>
        </div>

        {questions.map((q, qi) => (
          <Card key={q.id} className="border-l-4 border-l-brand-blue">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700 text-sm">Q{qi + 1}</span>
                  <div className="flex items-center gap-0 rounded border border-gray-200 overflow-hidden text-xs select-none">
                    <button
                      type="button"
                      onClick={() => updateMarks(qi, (q.marks ?? 1) - 1)}
                      className="px-2 py-1 text-gray-500 hover:bg-gray-100 font-bold leading-none"
                    >−</button>
                    <span className="px-2 py-1 font-semibold text-gray-700 bg-gray-50 min-w-[2rem] text-center leading-none border-x border-gray-200">
                      {q.marks ?? 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateMarks(qi, (q.marks ?? 1) + 1)}
                      className="px-2 py-1 text-gray-500 hover:bg-gray-100 font-bold leading-none"
                    >+</button>
                  </div>
                  <span className="text-xs text-gray-400">marks</span>
                </div>
                {questions.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeQuestion(qi)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-3">
              <Textarea
                value={q.question_text}
                onChange={(e) => updateQuestion(qi, e.target.value)}
                placeholder="Enter your question..."
                rows={2}
              />
              <p className="text-xs text-gray-400">Click the circle to mark the correct answer</p>
              {q.options.map((opt, oi) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectOption(qi, oi)}
                    className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${opt.is_correct ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"
                      }`}
                  >
                    {opt.is_correct && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <Input
                    value={opt.option_text}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    className={`h-8 text-sm ${opt.is_correct ? "border-green-400 bg-green-50" : ""}`}
                  />
                  {q.options.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOption(qi, oi)}
                      className="text-gray-400 hover:text-red-500 h-7 w-7 p-0 flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => addOption(qi)}
                className="text-xs mt-1"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Option
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addQuestion} className="w-full border-dashed text-sm">
          <Plus className="h-4 w-4 mr-1" /> Add Question
        </Button>
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={submitting}
        className="w-full bg-brand-blue hover:bg-brand-blue/90 mb-4"
      >
        {submitting
          ? "Saving..."
          : isEditing
            ? "Update Form"
            : "Save & Publish Form"}
      </Button>

      {/* Success: firm links */}
      {saved && publishedFormId && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800 flex items-center gap-2">
              <Check className="h-5 w-5" />
              {isEditing ? "Form Updated!" : "Form Published!"}
            </CardTitle>
            <p className="text-sm text-green-700">
              Share the link below with the HR of each company. Employees use this link to fill the assessment.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {firms.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No firms available to share with.</p>
            ) : (
              firms.map((firm) => (
                <div key={firm.id} className="bg-white border rounded-md p-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-800">{firm.name}</p>
                  {firm.locations.length === 0 ? (
                    <p className="text-xs text-gray-400 italic pl-1">
                      No active locations — add a location for this firm to generate a share link.
                    </p>
                  ) : (
                    firm.locations.map((loc) => {
                      const key = `${firm.id}:${loc.id}`;
                      const link = getPublicLink(firm.id, loc.id);
                      return (
                        <div
                          key={loc.id}
                          className="flex items-center justify-between gap-2 bg-gray-50 border rounded-md p-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{loc.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{link}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyLink(firm.id, loc.id)}
                              className="h-8 px-2"
                            >
                              {copiedKey === key ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(link, "_blank")}
                              className="h-8 px-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))
            )}
            <Button
              variant="outline"
              className="w-full mt-1"
              onClick={() => router.push(`/safety-classes/${safetyClassId}/analytics`)}
            >
              View Analytics
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
