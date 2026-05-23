// lib/supabase/server.ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function createServerSupabase() {
  const cookieStore = await cookies(); // Next 15: await required
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        // In Next 15, cookies() is read-only inside Server Components and
        // throws when supabase-ssr tries to write refreshed auth tokens.
        // Swallow the write — the middleware/route-handler path will sync
        // the refreshed token on the next request that runs in a writable
        // context.
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* read-only cookies in Server Component — ignore */
          }
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            /* read-only cookies in Server Component — ignore */
          }
        },
      },
    }
  );
}
