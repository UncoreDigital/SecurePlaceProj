"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  onAction,
  onBeforeSubmit,
  successMessage,
  errorMessage,
  children,
  openExternally,
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const controlled = !!openExternally;
  const isOpen = controlled ? openExternally!.open : open;
  const setIsOpen = controlled ? openExternally!.setOpen : setOpen;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onBeforeSubmit?.(fd);

    startTransition(async () => {
      try {
        await onAction(fd);
        if (successMessage) toast.success(successMessage);
        setIsOpen(false);
        formRef.current?.reset();
        router.refresh();
      } catch {
        if (errorMessage) toast.error(errorMessage);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !isPending && setIsOpen(v)}>
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

        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 py-4">
          {children}

          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={isPending} className="min-w-[160px]">
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {submitLabel}…
                </span>
              ) : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
