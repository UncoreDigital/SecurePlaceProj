"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Location } from "./columns";

interface EditLocationDialogProps {
  location: Location;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationUpdated: () => void;
  updateLocation: (formData: FormData) => Promise<void>;
}

export function EditLocationDialog({
  location,
  isOpen,
  onOpenChange,
  onLocationUpdated,
  updateLocation,
}: EditLocationDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.append("id", location.id);

    try {
      await updateLocation(formData);
      onOpenChange(false); // Close dialog
      onLocationUpdated(); // Refresh list
    } catch (e: any) {
      setError(e.message || "Failed to update location.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] z-[1000]">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
          <DialogDescription>
            Update the details for {location.name}. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={location.name}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              name="address"
              defaultValue={location.address}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact" className="text-right">
              Contact
            </Label>
            <Input
              id="contact"
              name="contact"
              defaultValue={location.description || ""}
              className="col-span-3"
            />
          </div>
          {error && (
            <p className="col-span-4 text-center text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end mt-4">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
