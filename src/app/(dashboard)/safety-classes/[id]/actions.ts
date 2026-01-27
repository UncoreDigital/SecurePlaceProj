"use server";

import { createClient } from "@supabase/supabase-js";

export async function scheduleClass(data: {
  safety_class_id: string;
  location_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  firm_id: string;
  created_by: string;
  created_at: string;
  status: string;
}) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error } = await supabase
    .from("scheduled_classes")
    .insert([data]);

  return { error };
}

export async function fetchLocations(firmId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, address")
    .eq("firm_id", firmId)
    .eq("is_active", true);

  return { data, error };
}
