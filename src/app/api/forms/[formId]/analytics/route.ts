import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/forms/[formId]/analytics?firmId=xxx&locationId=yyy
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;
  const firmId = req.nextUrl.searchParams.get("firmId");
  const locationId = req.nextUrl.searchParams.get("locationId");

  const supabase = adminClient();

  // Fetch form with questions and all options (with is_correct)
  const { data: form, error: formErr } = await supabase
    .from("class_forms")
    .select(`
      id, title, description, pass_score,
      form_questions (
        id, question_text, order_index, marks,
        form_question_options (
          id, option_text, is_correct, order_index
        )
      )
    `)
    .eq("id", formId)
    .maybeSingle();

  if (formErr || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  // Fetch responses — optionally filtered by firm
  let responseQuery = supabase
    .from("form_responses")
    .select(`
      id, employee_name, employee_email, score, passed, submitted_at, firm_id, marks_obtained, total_marks,
      firms:firm_id(name),
      form_response_answers (
        question_id,
        selected_option_id
      )
    `)
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });

  if (firmId) {
    responseQuery = responseQuery.eq("firm_id", firmId);
  }
  if (locationId) {
    responseQuery = responseQuery.eq("location_id", locationId);
  }

  const { data: responses, error: respErr } = await responseQuery;

  if (respErr) {
    return NextResponse.json({ error: respErr.message }, { status: 500 });
  }

  const allResponses = responses ?? [];
  const totalSubmissions = allResponses.length;
  const totalPassed = allResponses.filter((r: any) => r.passed).length;
  const totalFailed = totalSubmissions - totalPassed;
  const avgScore =
    totalSubmissions > 0
      ? Math.round(
          allResponses.reduce((sum: number, r: any) => sum + (r.score ?? 0), 0) /
            totalSubmissions
        )
      : 0;

  // Question-wise stats
  const questions = [...(form.form_questions ?? [])].sort(
    (a: any, b: any) => a.order_index - b.order_index
  );

  const questionStats = questions.map((q: any) => {
    const options = [...(q.form_question_options ?? [])].sort(
      (a: any, b: any) => a.order_index - b.order_index
    );

    // Count how many respondents selected each option
    const optionCounts: Record<string, number> = {};
    for (const opt of options) {
      optionCounts[opt.id] = 0;
    }
    let skippedCount = 0;

    for (const resp of allResponses) {
      const answer = (resp.form_response_answers ?? []).find(
        (a: any) => a.question_id === q.id
      );
      if (!answer || !answer.selected_option_id) {
        skippedCount++;
      } else if (answer.selected_option_id in optionCounts) {
        optionCounts[answer.selected_option_id]++;
      }
    }

    const correctOption = options.find((o: any) => o.is_correct);
    const correctCount = correctOption ? (optionCounts[correctOption.id] ?? 0) : 0;

    return {
      questionId: q.id,
      questionText: q.question_text,
      marks: q.marks ?? 1,
      totalAnswered: totalSubmissions - skippedCount,
      correctCount,
      incorrectCount: totalSubmissions - skippedCount - correctCount,
      options: options.map((opt: any) => ({
        id: opt.id,
        text: opt.option_text,
        isCorrect: opt.is_correct,
        count: optionCounts[opt.id] ?? 0,
        percentage:
          totalSubmissions > 0
            ? Math.round(((optionCounts[opt.id] ?? 0) / totalSubmissions) * 100)
            : 0,
      })),
    };
  });

  // Submissions list (for table display)
  const submissionsList = allResponses.map((r: any) => ({
    id: r.id,
    employeeName: r.employee_name,
    employeeEmail: r.employee_email,
    score: r.score,
    passed: r.passed,
    marksObtained: r.marks_obtained,
    totalMarks: r.total_marks,
    submittedAt: r.submitted_at,
    firmId: r.firm_id,
    firmName: (r.firms as any)?.name ?? "Unknown",
  }));

  return NextResponse.json({
    formId: form.id,
    formTitle: form.title,
    passScore: form.pass_score,
    totalSubmissions,
    totalPassed,
    totalFailed,
    avgScore,
    passRate: totalSubmissions > 0 ? Math.round((totalPassed / totalSubmissions) * 100) : 0,
    questionStats,
    submissions: submissionsList,
  });
}
