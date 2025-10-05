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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('🚨 Missing Supabase environment variables:', { 
      url: !!url, 
      key: !!key 
    });
    throw new Error('Supabase environment variables are not configured');
  }
  
  console.log('🔧 Creating Supabase browser client:', {
    url: url.substring(0, 30) + '...',
    keyLength: key.length
  });
  
  return createBrowserClient(url, key, {
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
}
