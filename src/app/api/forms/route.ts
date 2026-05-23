import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/forms?safetyClassId=xxx  — check if a form exists for a class
export async function GET(req: NextRequest) {
  const safetyClassId = req.nextUrl.searchParams.get("safetyClassId");
  if (!safetyClassId) {
    return NextResponse.json({ error: "safetyClassId required" }, { status: 400 });
  }

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("class_forms")
    .select(`
      id, title, description, pass_score, is_active, created_at,
      form_questions (
        id, question_text, order_index, marks,
        form_question_options (
          id, option_text, is_correct, order_index
        )
      )
    `)
    .eq("safety_class_id", safetyClassId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}

// POST /api/forms — create a new MCQ form with questions
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { safetyClassId, title, description, passScore, questions } = body;

  if (!safetyClassId || !title || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: "safetyClassId, title, and at least one question are required" },
      { status: 400 }
    );
  }

  // Validate questions
  for (const q of questions) {
    if (!q.question_text?.trim()) {
      return NextResponse.json({ error: "All questions must have text" }, { status: 400 });
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return NextResponse.json(
        { error: "Each question must have at least 2 options" },
        { status: 400 }
      );
    }
    const hasCorrect = q.options.some((o: any) => o.is_correct);
    if (!hasCorrect) {
      return NextResponse.json(
        { error: `Question "${q.question_text}" must have exactly one correct answer` },
        { status: 400 }
      );
    }
  }

  const supabase = adminClient();

  // Check if a form already exists for this class (UNIQUE constraint on safety_class_id)
  const { data: existingForm } = await supabase
    .from("class_forms")
    .select("id")
    .eq("safety_class_id", safetyClassId)
    .maybeSingle();

  let formId: string;

  if (existingForm) {
    // Update existing form metadata
    const { error: updateErr } = await supabase
      .from("class_forms")
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        pass_score: passScore ?? 70,
        is_active: true,
      })
      .eq("id", existingForm.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Delete old questions (cascades to options; response summaries are preserved)
    await supabase.from("form_questions").delete().eq("form_id", existingForm.id);

    formId = existingForm.id;
  } else {
    // Insert a new form
    const { data: form, error: formErr } = await supabase
      .from("class_forms")
      .insert({
        safety_class_id: safetyClassId,
        title: title.trim(),
        description: description?.trim() || null,
        pass_score: passScore ?? 70,
      })
      .select("id")
      .single();

    if (formErr || !form) {
      return NextResponse.json({ error: formErr?.message ?? "Failed to create form" }, { status: 500 });
    }

    formId = form.id;
  }

  // Insert questions and their options
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const { data: question, error: qErr } = await supabase
      .from("form_questions")
      .insert({
        form_id: formId,
        question_text: q.question_text.trim(),
        order_index: qi,
        marks: q.marks ?? 1,
      })
      .select("id")
      .single();

    if (qErr || !question) {
      return NextResponse.json(
        { error: qErr?.message ?? "Failed to create question" },
        { status: 500 }
      );
    }

    const options = q.options.map((opt: any, oi: number) => ({
      question_id: question.id,
      option_text: opt.option_text.trim(),
      is_correct: !!opt.is_correct,
      order_index: oi,
    }));

    const { error: optErr } = await supabase.from("form_question_options").insert(options);
    if (optErr) {
      return NextResponse.json({ error: optErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: formId }, { status: 201 });
}
