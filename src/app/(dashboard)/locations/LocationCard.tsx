"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Location } from "./columns";
import { Ellipsis } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditLocationDialog } from "./edit-location-dialog";
import { supabase } from "@/lib/supabaseClient";

interface LocationCardProps {
  location: Location;
  onActionComplete: () => void; // Function to trigger a refetch
}

const LocationCard = ({ location, onActionComplete }: LocationCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const Map = useMemo(
    () =>
      dynamic(() => import("./LocationMap"), {
        loading: () => <p className="text-center">Loading map...</p>,
        ssr: false,
      }),
    []
  );

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', location.id);

      if (error) {
        throw error;
      }

      onActionComplete(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete location:", error);
      alert("Failed to delete location.");
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{location.name}</CardTitle>
            <CardDescription>{location.address}</CardDescription>
          </div>
          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-[1000]">
                <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                  Edit
                </DropdownMenuItem>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-red-500">
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent className="z-[1000]">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this location.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="flex-grow h-48">
        <Map
          latitude={location.latitude}
          longitude={location.longitude}
          name={location.name}
        />
      </CardContent>
      <CardFooter>
        <p className="text-sm text-slate-600">
          Description: {location.description || "N/A"}
        </p>
      </CardFooter>

      {/* The Edit Dialog is kept outside the main flow and controlled by state */}
      <EditLocationDialog
        location={location}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onLocationUpdated={onActionComplete}
      />
    </Card>
  );
};

export default LocationCard;
