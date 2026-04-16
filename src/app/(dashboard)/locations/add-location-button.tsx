"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useUser } from "@/hooks/useUser";

interface AddLocationButtonProps {
  onLocationAdded: () => void;
  createLocation: (formData: FormData) => Promise<void>;
}

export function AddLocationButton({ onLocationAdded, createLocation }: AddLocationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();

  // Only show for firm admins
  if (!user || user.role !== "firm_admin") {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") || "").trim();
      const currentEmail = user.email?.toLowerCase() || "";

      if (!email) {
        setError("Email is required.");
        return;
      }

      if (!currentEmail) {
        setError("Unable to verify your account email. Please refresh and try again.");
        return;
      }

      if (currentEmail === email.toLowerCase()) {
        // setError("You cannot create a location with your own email address.");
        // return;
      } else {
         // Auto-generate a secure password
        const autoPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)))
          .map((b) => b.toString(36))
          .join("")
          .slice(0, 12);
        formData.append("password", autoPassword);
        alert(autoPassword);
      }     

      // Add firm_id for firm_admin (automatically use their firm)
      if (user.firmId) {
        formData.append("firmId", user.firmId);
      }
      console.log("createLocation formData:", Object.fromEntries(formData.entries()));
      await createLocation(formData);
      setIsOpen(false);
      onLocationAdded();
      
      // Reset form
      (event.target as HTMLFormElement).reset();
    } catch (e: any) {
      setError(e.message || "Failed to create location. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add New Location
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] z-[1000]">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>
            Enter the details for the new location. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" name="name" className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
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
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact" className="text-right">
              Contact
            </Label>
            <Input id="contact" name="contact" className="col-span-3" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-brand-blue hover:bg-brand-blue/90"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Location
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
