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
    if (user && user.firmId) {
      setLoading(true);
      setError(null);
      try {
        const supabase = createBrowserSupabase();
        
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('*')
          .eq('firm_id', user?.firmId)
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
    } else if (user) {
      setLoading(false);
      setLocations([]);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && user.firmId) {
      fetchLocations();
    }
  }, [authLoading, user, user?.firmId, fetchLocations]);

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onActionComplete={fetchLocations} // <-- Pass the refetch function
            />
          ))}
        </div>
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
