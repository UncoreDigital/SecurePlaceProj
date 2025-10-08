// Use the singleton browser client to prevent multiple GoTrueClient instances
import { createBrowserSupabase } from "./supabase/browser";

// Export a single instance that all components can use
export const supabase = createBrowserSupabase();