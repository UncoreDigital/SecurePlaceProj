import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/forms/[formId] — public: fetch form with questions (no correct answer revealed)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  const supabase = adminClient();
  const { data: form, error } = await supabase
    .from("class_forms")
    .select(`
      id, title, description, pass_score,
      safety_class_id,
      form_questions (
        id, question_text, order_index, marks,
        form_question_options (
          id, option_text, order_index
        )
      )
    `)
    .eq("id", formId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  // Sort questions and options by order_index; strip is_correct from options
  const sorted = {
    ...form,
    form_questions: [...(form.form_questions ?? [])]
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((q: any) => ({
        ...q,
        form_question_options: [...(q.form_question_options ?? [])]
          .sort((a: any, b: any) => a.order_index - b.order_index),
      })),
  };

  return NextResponse.json(sorted);
}
