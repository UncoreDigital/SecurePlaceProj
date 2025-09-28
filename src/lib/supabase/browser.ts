"use client";
// Uploads a file to Supabase Storage and returns the public URL
export async function uploadImageToSupabase(file: File, folder = "thumbnails") {
  const supabase = createBrowserSupabase();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;
  const { data, error } = await supabase.storage.from(folder).upload(fileName, file);
  if (error) throw error;
  // Get public URL
  const { data: urlData } = supabase.storage.from(folder).getPublicUrl(fileName);
  return urlData?.publicUrl || "";
}
// lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
