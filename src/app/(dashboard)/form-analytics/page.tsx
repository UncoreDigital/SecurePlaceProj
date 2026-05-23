import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { ChartNoAxesColumn, FileText } from "lucide-react";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireFirmAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: me } = await supabase
    .from("user_profiles")
    .select("role, firm_id")
    .eq("id", user.id)
    .single();

  if (!me || (me.role !== "firm_admin" && me.role !== "super_admin")) {
    redirect("/safety-classes");
  }

  return { role: me.role as string, firmId: me.firm_id as string | null };
}

export default async function FormAnalyticsPage() {
  const me = await requireFirmAdmin();

  const supabase = adminClient();

  // Fetch all safety classes that have an active form
  const { data: forms } = await supabase
    .from("class_forms")
    .select(`
      id, title, pass_score,
      safety_classes (id, title, mode, type)
    `)
    .eq("is_active", true);

  // For each form, get the submission count filtered by this firm
  const firmId = me.firmId;

  const formIds = (forms ?? []).map((f) => f.id);
  let responseCounts: Record<string, { total: number; passed: number }> = {};

  if (formIds.length > 0 && firmId) {
    const { data: responses } = await supabase
      .from("form_responses")
      .select("form_id, passed")
      .in("form_id", formIds)
      .eq("firm_id", firmId);

    for (const r of responses ?? []) {
      if (!responseCounts[r.form_id]) responseCounts[r.form_id] = { total: 0, passed: 0 };
      responseCounts[r.form_id].total++;
      if (r.passed) responseCounts[r.form_id].passed++;
    }
  }

  const formList = (forms ?? []).map((f) => ({
    formId: f.id,
    formTitle: f.title,
    passScore: f.pass_score,
    safetyClass: (f.safety_classes as any),
    stats: responseCounts[f.id] ?? { total: 0, passed: 0 },
  }));

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-1">Home &gt; Form Analytics</nav>
        <h1 className="text-3xl font-bold text-brand-blue flex items-center gap-2">
          <ChartNoAxesColumn className="h-7 w-7" /> Form Analytics
        </h1>
        <p className="text-gray-500 text-sm mt-1">View assessment results for your company</p>
      </div>

      {formList.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">No forms available yet</p>
          <p className="text-sm text-gray-400 mt-1">Forms will appear here once they are published for safety classes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formList.map((item) => {
            const passRate = item.stats.total > 0
              ? Math.round((item.stats.passed / item.stats.total) * 100)
              : null;

            return (
              <Link
                key={item.formId}
                href={`/safety-classes/${item.safetyClass?.id}/analytics`}
                className="block group"
              >
                <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow hover:border-brand-blue/30 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ChartNoAxesColumn className="h-5 w-5 text-brand-blue" />
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                      {item.safetyClass?.mode === "InPerson" ? "In-Person" : item.safetyClass?.mode}
                    </span>
                  </div>

                  <p className="font-semibold text-gray-800 text-sm leading-snug mb-1 group-hover:text-brand-blue transition-colors">
                    {item.safetyClass?.title ?? "Unknown Class"}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">{item.formTitle}</p>

                  <div className="mt-auto grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-gray-800">{item.stats.total}</p>
                      <p className="text-xs text-gray-400">Responses</p>
                    </div>
                    <div className="bg-green-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-green-700">{item.stats.passed}</p>
                      <p className="text-xs text-gray-400">Passed</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-gray-700">
                        {passRate !== null ? `${passRate}%` : "—"}
                      </p>
                      <p className="text-xs text-gray-400">Pass Rate</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
