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

  if (!firmId || !employeeName?.trim() || !answers || typeof answers !== "object") {
    return NextResponse.json(
      { error: "firmId, employeeName, and answers are required" },
      { status: 400 }
    );
  }

  const supabase = adminClient();

  // Fetch the form with questions and correct answers
  const { data: form, error: formErr } = await supabase
    .from("class_forms")
    .select(`
      id, pass_score,
      form_questions (
        id, marks,
        form_question_options (
          id, is_correct
        )
      )
    `)
    .eq("id", formId)
    .eq("is_active", true)
    .maybeSingle();

  if (formErr || !form) {
    return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
  }

  const questions: any[] = form.form_questions ?? [];

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

  // Insert response record
  const { data: response, error: responseErr } = await supabase
    .from("form_responses")
    .insert({
      form_id: formId,
      firm_id: firmId,
      location_id: locationId || null,
      employee_name: employeeName.trim(),
      employee_email: employeeEmail?.trim() || null,
      score: scorePercent,
      passed,
      marks_obtained: marksObtained,
      total_marks: totalMarks,
    })
    .select("id")
    .single();

  if (responseErr || !response) {
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
