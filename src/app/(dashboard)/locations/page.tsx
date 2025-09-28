"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Location } from "./columns";
import LocationCard from "./LocationCard";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLocationButton } from "./add-location-button";

export default function LocationsPage() {
  const { user, loading: authLoading } = useUser(); // Get the logged-in user from Supabase
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    if (user) {
      setLoading(true);
      setError(null);
      try {
        const supabase = createBrowserSupabase();
        // Fetch all active locations for all users, including firm details
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('*, firms(*)')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (fetchError) {
          throw fetchError;
        }
        setLocations(data || []);
      } catch (error) {
        console.error("Failed to fetch locations:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch locations");
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchLocations();
    }
  }, [authLoading, user, fetchLocations]);

  // Display a loading state while authenticating or fetching data
  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-red-600">Error Loading Locations</h2>
          <p className="text-slate-500 mt-2">{error}</p>
          <Button
            onClick={fetchLocations}
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-brand-blue">
          Location Management
        </h1>
        <AddLocationButton onLocationAdded={fetchLocations} />
      </div>

      {locations.length > 0 ? (
        (!user.firmId) ? (
          <div className="grid gap-6">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-sm">
                      <th className="px-4 py-2 text-left font-semibold">Name</th>
                      <th className="px-4 py-2 text-left font-semibold">Address</th>
                      <th className="px-4 py-2 text-left font-semibold">Description</th>
                      <th className="px-4 py-2 text-left font-semibold">Firm</th>
                      <th className="px-4 py-2 text-left font-semibold">Active</th>
                      {/* <th className="px-4 py-2 text-center">
                  <SlidersHorizontal className="inline w-5 h-5 text-gray-400" />
                </th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((row, idx) => (
                      <tr
                        key={row.name + idx}
                        className="bg-white border-b hover:bg-gray-50 text-gray-700"
                      >
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.address}</td>
                        <td className="px-4 py-2">{row.description}</td>
                        <td className="px-4 py-2">{row.firms?.name}</td>
                        <td className="px-4 py-2">{row.is_active ? 'Yes' : 'No'}</td>
                        {/* <td className="px-4 py-2 text-center">
                    <button
                      className="p-1 rounded hover:bg-gray-100"
                      onClick={() => setSelected(row)}
                    >
                      <Eye className="w-5 h-5 text-gray-500" />
                    </button>
                  </td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination and controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span>Showing</span>
                  <select className="border rounded px-2 py-1">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                  <span>of 500</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="border rounded px-3 py-1 text-gray-700 text-sm">Reset Filters</button>
                  <button className="border rounded px-2 py-1 text-gray-400" disabled>
                    &lt;&lt;
                  </button>
                  <button className="border rounded px-2 py-1 text-gray-400" disabled>
                    &lt;
                  </button>
                  <span className="text-gray-700 text-sm">1</span>
                  <span className="text-gray-500 text-sm">of 25 pages</span>
                  <button className="border rounded px-2 py-1 text-gray-700">
                    &gt;
                  </button>
                  <button className="border rounded px-2 py-1 text-gray-700">
                    &gt;&gt;
                  </button>
                </div>
              </div>
            </div>

          </div>
        ) :
          (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  onActionComplete={fetchLocations} // <-- Pass the refetch function
                />
              ))}
            </div>
          )
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-lg">
          <h2 className="text-xl font-semibold">No locations found.</h2>
          <p className="text-slate-500 mt-2">
            Get started by adding your first location.
          </p>
        </div>
      )}
    </div>
  );
}
