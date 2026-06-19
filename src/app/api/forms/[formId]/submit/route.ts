import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// POST /api/forms/[formId]/submit
// Body: { firmId, employeeName, employeeEmail, answers: { [questionId]: optionId } }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { firmId, locationId, employeeName, employeeEmail, answers } = body;

  if (
    !firmId ||
    !employeeName?.trim() ||
    !employeeEmail?.trim() ||
    !answers ||
    typeof answers !== "object"
  ) {
    return NextResponse.json(
      { error: "firmId, employeeName, employeeEmail, and answers are required" },
      { status: 400 }
    );
  }

  const normalizedEmail = employeeEmail.trim().toLowerCase();

  const supabase = adminClient();

  // Prevent duplicate submissions: one response per email per form
  const { data: existingResponse, error: existingErr } = await supabase
    .from("form_responses")
    .select("id")
    .eq("form_id", formId)
    .ilike("employee_email", normalizedEmail)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }
  if (existingResponse) {
    return NextResponse.json(
      { error: "This form has already been submitted with this email address." },
      { status: 409 }
    );
  }

  // Fetch the form with full question/option data (needed for scoring AND for
  // building the immutable per-response snapshot).
  const { data: form, error: formErr } = await supabase
    .from("class_forms")
    .select(`
      id, pass_score,
      form_questions (
        id, question_text, order_index, marks,
        form_question_options (
          id, option_text, is_correct, order_index
        )
      )
    `)
    .eq("id", formId)
    .eq("is_active", true)
    .maybeSingle();

  if (formErr || !form) {
    return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
  }

  const questions: any[] = [...(form.form_questions ?? [])].sort(
    (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  if (questions.length === 0) {
    return NextResponse.json({ error: "Form has no questions" }, { status: 400 });
  }

  // Validate that all questions are answered
  for (const q of questions) {
    if (!answers[q.id]) {
      return NextResponse.json(
        { error: "All questions must be answered" },
        { status: 400 }
      );
    }
  }

  // Calculate marks-based score
  let marksObtained = 0;
  const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.marks ?? 1), 0);
  for (const q of questions) {
    const selectedOptionId = answers[q.id];
    const correctOption = (q.form_question_options ?? []).find((o: any) => o.is_correct);
    if (correctOption && selectedOptionId === correctOption.id) {
      marksObtained += q.marks ?? 1;
    }
  }

  const scorePercent = Math.round((marksObtained / totalMarks) * 100);
  const passed = scorePercent >= (form.pass_score ?? 70);

  // Build an immutable snapshot of exactly what this employee saw and selected.
  // Shape matches what the response-detail endpoint returns, so the detail view
  // can render it directly and stays correct even after the form is edited.
  const questionsSnapshot = questions.map((q: any) => {
    const selectedOptionId = answers[q.id] ?? null;
    const options = [...(q.form_question_options ?? [])]
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((o: any) => ({
        id: o.id,
        text: o.option_text,
        isCorrect: !!o.is_correct,
        isSelected: selectedOptionId === o.id,
      }));
    const correctOption = options.find((o) => o.isCorrect);
    return {
      questionId: q.id,
      questionText: q.question_text,
      marks: q.marks ?? 1,
      selectedOptionId,
      isCorrectAnswer: !!selectedOptionId && selectedOptionId === correctOption?.id,
      options,
    };
  });

  // Insert response record
  const { data: response, error: responseErr } = await supabase
    .from("form_responses")
    .insert({
      form_id: formId,
      firm_id: firmId,
      location_id: locationId || null,
      employee_name: employeeName.trim(),
      employee_email: normalizedEmail,
      score: scorePercent,
      passed,
      marks_obtained: marksObtained,
      total_marks: totalMarks,
      questions_snapshot: questionsSnapshot,
    })
    .select("id")
    .single();

  if (responseErr || !response) {
    if (responseErr?.code === "23505") {
      return NextResponse.json(
        { error: "This form has already been submitted with this email address." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: responseErr?.message ?? "Failed to save response" },
      { status: 500 }
    );
  }

  // Insert individual answer records
  const answerRows = questions.map((q: any) => ({
    response_id: response.id,
    question_id: q.id,
    selected_option_id: answers[q.id] || null,
  }));

  const { error: answerErr } = await supabase
    .from("form_response_answers")
    .insert(answerRows);

  if (answerErr) {
    return NextResponse.json({ error: answerErr.message }, { status: 500 });
  }

  return NextResponse.json({
    score: scorePercent,
    passed,
    marksObtained,
    totalMarks,
    passScore: form.pass_score ?? 70,
  });
}
