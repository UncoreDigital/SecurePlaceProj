import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/forms/[formId]/responses/[responseId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string; responseId: string }> }
) {
  const { formId, responseId } = await params;
  const supabase = adminClient();

  // Fetch the response with answers
  const { data: response, error: respErr } = await supabase
    .from("form_responses")
    .select(`
      id, employee_name, employee_email, score, passed,
      marks_obtained, total_marks, submitted_at, firm_id,
      firms:firm_id(name),
      form_response_answers (
        question_id,
        selected_option_id
      )
    `)
    .eq("id", responseId)
    .eq("form_id", formId)
    .maybeSingle();

  if (respErr || !response) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  // Fetch form questions with options
  const { data: form, error: formErr } = await supabase
    .from("class_forms")
    .select(`
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

  const answerMap = new Map<string, string | null>(
    (response.form_response_answers ?? []).map((a: any) => [a.question_id, a.selected_option_id])
  );

  const questions = [...(form.form_questions ?? [])]
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((q: any) => {
      const options = [...(q.form_question_options ?? [])]
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((o: any) => ({
          id: o.id,
          text: o.option_text,
          isCorrect: o.is_correct,
          isSelected: answerMap.get(q.id) === o.id,
        }));

      const selectedOptionId = answerMap.get(q.id) ?? null;
      const correctOption = options.find((o) => o.isCorrect);
      const isCorrectAnswer = !!selectedOptionId && selectedOptionId === correctOption?.id;

      return {
        questionId: q.id,
        questionText: q.question_text,
        marks: q.marks ?? 1,
        selectedOptionId,
        isCorrectAnswer,
        options,
      };
    });

  return NextResponse.json({
    id: response.id,
    employeeName: response.employee_name,
    employeeEmail: response.employee_email,
    score: response.score,
    passed: response.passed,
    marksObtained: response.marks_obtained,
    totalMarks: response.total_marks,
    submittedAt: response.submitted_at,
    firmName: (response.firms as any)?.name ?? "Unknown",
    questions,
  });
}
