"use client";

import { useState, useRef } from "react";
import { z } from "zod";
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
import { createFirm } from "../(super-admin)/firm-management/actions";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  industry: z.string().trim().optional(),
  contactEmail: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  phoneNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export function AddFirmButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    setFormError(null);
    setPending(true);

    try {
      const fd = new FormData(event.currentTarget);
      const raw = {
        name: String(fd.get("name") || ""),
        industry: String(fd.get("industry") || ""),
        contactEmail: String(fd.get("contactEmail") || ""),
        phoneNumber: String(fd.get("phoneNumber") || ""),
        address: String(fd.get("address") || ""),
      };

      const data = schema.parse(raw);

      const res = await createFirm({
        name: data.name,
        industry: data.industry || "",
        contactEmail: data.contactEmail || "",
        phoneNumber: data.phoneNumber || "",
        address: data.address || "",
      });

      if ("error" in res && res.error) {
        setFormError(res.error);
        return;
      }

      // success
      formRef.current?.reset();
      setIsOpen(false);
    } catch (err: any) {
      // zod or network/server error
      setFormError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !pending && setIsOpen(v)}>
      <DialogTrigger asChild>
        <Button>Add New Firm</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Firm</DialogTitle>
          <DialogDescription>
            Enter the details for the new firm here. Click save when you are
            done.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" name="name" className="col-span-3" required />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="industry" className="text-right">
              Industry
            </Label>
            <Input id="industry" name="industry" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contactEmail" className="text-right">
              Email
            </Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phoneNumber" className="text-right">
              Phone
            </Label>
            <Input id="phoneNumber" name="phoneNumber" className="col-span-3" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input id="address" name="address" className="col-span-3" />
          </div>

          {formError && (
            <p className="text-sm text-red-600 -mt-1">{formError}</p>
          )}

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save Firm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
