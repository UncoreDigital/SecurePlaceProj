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

interface LocationCardProps {
  location: Location;
  onActionComplete: () => void; // Function to trigger a refetch
  deleteLocation: (formData: FormData) => Promise<void>; // Add server action prop
}

const LocationCard = ({ location, onActionComplete, deleteLocation }: LocationCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const Map = useMemo(
    () =>
      dynamic(() => import("./LocationMap"), {
        loading: () => <p className="text-center">Loading map...</p>,
        ssr: false,
      }),
    []
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Create FormData as expected by server action
      const formData = new FormData();
      formData.append("id", location.id);

      await deleteLocation(formData);
      
      onActionComplete(); // Refresh the list
    } catch (error: any) {
      console.error("❌ Failed to delete location:", error);
    } finally {
      setIsDeleting(false);
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
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
              {deleteError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{deleteError}</p>
                </div>
              )}
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
