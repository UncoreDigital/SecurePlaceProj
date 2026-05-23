"use client";

import { useState } from "react";
import { CircleCheckBig, CircleX, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Option {
  id: string;
  option_text: string;
  order_index: number;
}

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  marks?: number;
  form_question_options: Option[];
}

interface Form {
  id: string;
  title: string;
  description: string | null;
  pass_score: number;
  form_questions: Question[];
}

interface FormPageClientProps {
  form: Form;
  firmId: string;
  firmName: string;
  locationId?: string | null;
}

type SubmitResult = {
  score: number;
  passed: boolean;
  marksObtained: number;
  totalMarks: number;
  passScore: number;
};

export default function FormPageClient({ form, firmId, firmName, locationId }: FormPageClientProps) {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [detailsStarted, setDetailsStarted] = useState(false);

  const questions = [...(form.form_questions ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  const allAnswered = questions.every((q) => answers[q.id]);
  const answeredCount = Object.keys(answers).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!allAnswered) {
      setError(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${form.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId,
          locationId: locationId ?? null,
          employeeName: employeeName.trim(),
          employeeEmail: employeeEmail.trim() || null,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Result Screen ----
  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardContent className="pt-8 pb-8 space-y-4">
            {result.passed ? (
              <CircleCheckBig className="h-16 w-16 text-green-500 mx-auto" />
            ) : (
              <CircleX className="h-16 w-16 text-red-400 mx-auto" />
            )}

            <h1
              className={`text-2xl font-bold ${
                result.passed ? "text-green-700" : "text-red-600"
              }`}
            >
              {result.passed ? "Congratulations!" : "Better Luck Next Time"}
            </h1>

            <p className="text-gray-600">
              {result.passed
                ? `You passed the assessment for ${form.title}.`
                : `You did not meet the pass score for ${form.title}.`}
            </p>

            <div className="bg-gray-100 rounded-xl p-4 space-y-2">
              <div className="text-4xl font-extrabold text-gray-800">{result.score}%</div>
              <div className="text-sm text-gray-500">Your Score</div>
              <div className="text-xs text-gray-400">
                {result.marksObtained} / {result.totalMarks} marks &bull; Pass score:{" "}
                {result.passScore}%
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Your response has been recorded. You may close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Form Screen ----
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-block bg-brand-blue text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
            {firmName}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
          {form.description && (
            <p className="text-gray-500 mt-2 text-sm">{form.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {questions.length} questions &bull; Pass score: {form.pass_score}%
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="emp-name">Full Name *</Label>
                <Input
                  id="emp-name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emp-email">Email (optional)</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          {questions.map((q, qi) => (
            <Card
              key={q.id}
              className={`transition-all ${
                answers[q.id] ? "border-green-200" : ""
              }`}
            >
              <CardContent className="pt-5 pb-5">
                <p className="font-medium text-gray-800 mb-3">
                  <span className="text-brand-blue font-bold mr-2">{qi + 1}.</span>
                  {q.question_text}
                  <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-normal">
                    {q.marks ?? 1} {(q.marks ?? 1) === 1 ? "mark" : "marks"}
                  </span>
                </p>
                <div className="space-y-2">
                  {[...(q.form_question_options ?? [])]
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((opt) => {
                      const selected = answers[q.id] === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selected
                              ? "border-brand-blue bg-blue-50 text-brand-blue"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={opt.id}
                            checked={selected}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                            }
                            className="accent-brand-blue"
                          />
                          <span className="text-sm">{opt.option_text}</span>
                        </label>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Progress */}
          <div className="text-center text-sm text-gray-500">
            {answeredCount} of {questions.length} answered
            {!allAnswered && (
              <span className="text-amber-600 ml-2">
                — please answer all questions to submit
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <CircleAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !allAnswered || !employeeName.trim()}
            className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white py-3 text-base"
          >
            {submitting ? "Submitting..." : "Submit Assessment"}
          </Button>

          <p className="text-center text-xs text-gray-400">
            By submitting, your answers will be recorded and shared with your company.
          </p>
        </form>
      </div>
    </div>
  );
}
