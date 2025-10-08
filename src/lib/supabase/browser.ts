"use client";

import { createBrowserClient } from "@supabase/ssr";

// Create a single browser client instance at module load time
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Single instance created once and reused - prevents multiple GoTrueClient warnings
const browserClient = createBrowserClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  },
  global: {
    headers: {
      'X-Client-Info': 'secure-place-web'
    }
  }
});

console.log('✅ Supabase browser client initialized once');

// Export function that always returns the same instance
export function createBrowserSupabase() {
  return browserClient;
}

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
