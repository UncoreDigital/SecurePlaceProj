import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import FormPageClient from "./FormPage.client";

// Public page — no authentication required
export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ firmId?: string; locationId?: string }>;
}) {
  const { formId } = await params;
  const { firmId, locationId } = await searchParams;

  if (!firmId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm p-6">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Invalid Link</h1>
          <p className="text-gray-500 text-sm">
            This link is missing required information. Please use the link provided by your HR.
          </p>
        </div>
      </div>
    );
  }

  const supabase = adminClient();

  // Fetch form with questions (no is_correct exposed to client)
  const { data: form, error: formErr } = await supabase
    .from("class_forms")
    .select(`
      id, title, description, pass_score,
      form_questions (
        id, question_text, order_index,
        form_question_options (
          id, option_text, order_index
        )
      )
    `)
    .eq("id", formId)
    .eq("is_active", true)
    .maybeSingle();

  if (formErr || !form) {
    notFound();
  }

  // Fetch firm name
  const { data: firm } = await supabase
    .from("firms")
    .select("id, name")
    .eq("id", firmId)
    .maybeSingle();

  if (!firm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm p-6">
          <div className="text-4xl mb-4">🏢</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Company Not Found</h1>
          <p className="text-gray-500 text-sm">
            The company associated with this link could not be found. Please contact your HR.
          </p>
        </div>
      </div>
    );
  }

  // Sort questions and options server-side
  const sortedForm = {
    ...form,
    form_questions: [...(form.form_questions ?? [])]
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((q: any) => ({
        ...q,
        form_question_options: [...(q.form_question_options ?? [])].sort(
          (a: any, b: any) => a.order_index - b.order_index
        ),
      })),
  };

  return (
    <FormPageClient
      form={sortedForm as any}
      firmId={firmId}
      firmName={firm.name}
      locationId={locationId ?? null}
    />
  );
}
