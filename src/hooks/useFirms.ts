import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useUser";

export interface Firm {
  id: string;
  name: string;
  logo_url?: string;
}

// Stable identity for the empty case. A `= []` default in the destructuring
// below would allocate a fresh array on every render while data is undefined,
// so any effect depending on `firms` would re-run forever.
const NO_FIRMS: Firm[] = [];

export function useFirms() {
  const { user, loading: userLoading } = useUser();

  const { data, isLoading, error } = useQuery<Firm[]>({
    queryKey: ["firms", user?.id, user?.role, user?.firmId],
    queryFn: async () => {
      let query = supabase
        .from("firms")
        .select("id, name, logo_url")
        .order("name", { ascending: true });

      if (user?.role === "firm_admin" && user?.firmId) {
        query = query.eq("id", user.firmId);
      }

      const { data, error } = await query;
      console.log("Fetched firms:", data, "Error:", error);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !userLoading && !!user,
    staleTime: 5 * 60 * 1000,   // treat as fresh for 5 min
    gcTime: 10 * 60 * 1000,     // keep in cache for 10 min
  });

  return { firms: data ?? NO_FIRMS, loading: userLoading || isLoading, error };
}
