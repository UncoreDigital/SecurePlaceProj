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
import { toast } from "sonner";

export function FormDialog({
  triggerLabel,
  title,
  description,
  submitLabel,
  onAction, // server action (FormData) => Promise<void>
  onBeforeSubmit, // optional (fd) => void
  successMessage,
  errorMessage,
  children, // your <input name="..." /> etc.
  openExternally, // allow parent to control open if needed
}: {
  triggerLabel: string | React.ReactNode;
  title: string;
  description?: string;
  submitLabel: string;
  onAction: (fd: FormData) => Promise<void> | void;
  onBeforeSubmit?: (fd: FormData) => void;
  successMessage?: string;
  errorMessage?: string;
  children: React.ReactNode;
  openExternally?: { open: boolean; setOpen: (v: boolean) => void } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const controlled = !!openExternally;
  const isOpen = controlled ? openExternally!.open : open;
  const setIsOpen = controlled ? openExternally!.setOpen : setOpen;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !pending && setIsOpen(v)}>
      <DialogTrigger asChild>
        {typeof triggerLabel === "string" ? (
          <Button onClick={() => setIsOpen(true)}>{triggerLabel}</Button>
        ) : (
          <div onClick={() => setIsOpen(true)} className="w-full">
            {triggerLabel}
          </div>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <form
          action={async (fd) => {
            setPending(true);
            try {
              onBeforeSubmit?.(fd);
              await onAction(fd);
              if (successMessage) toast.success(successMessage);
              setIsOpen(false);
            } catch {
              if (errorMessage) toast.error(errorMessage);
            } finally {
              setPending(false);
            }
          }}
          className="grid gap-4 py-4"
        >
          {children}

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
