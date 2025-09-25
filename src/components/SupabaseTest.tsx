"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>("Testing...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createBrowserSupabase();
        
        // Test basic connection
        const { data, error } = await supabase
          .from('firms')
          .select('count')
          .limit(1);

        if (error) {
          setError(`Database Error: ${error.message}`);
          setConnectionStatus("❌ Connection Failed");
        } else {
          setConnectionStatus("✅ Connected Successfully");
          setError(null);
        }
      } catch (err) {
        setError(`Connection Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setConnectionStatus("❌ Connection Failed");
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Supabase Connection Test</h3>
      <p className="text-sm text-gray-600 mb-2">
        Status: <span className="font-mono">{connectionStatus}</span>
      </p>
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
