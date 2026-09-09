"use client";

import { useState } from "react";
import { TriangleAlert, LoaderCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * One confirmation dialog for every destructive action in the dashboard.
 *
 * This replaces window.confirm(), which could not be styled, could not show
 * which record was about to be destroyed, blocked the main thread, and is
 * suppressible by the browser — a "Delete" that silently proceeded because the
 * user had ticked "prevent additional dialogs" is a data-loss bug.
 *
 * Built on Radix AlertDialog so focus trapping, focus restore, Escape, scroll
 * locking and aria-modal wiring are handled rather than reimplemented. Radix
 * also puts initial focus on Cancel, which is the right default when the other
 * button is irreversible.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /**
   * Return a string to report a failure and keep the dialog open; return
   * nothing (or void) to close it. Throwing is handled too, so a network error
   * cannot leave the dialog stuck in its pending state.
   */
  onConfirm: () => Promise<string | void> | string | void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setPending(true);
    setError("");
    try {
      const message = await onConfirm();
      if (message) {
        setError(message);
        return;
      }
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      // Ignore dismissals while the action is in flight: closing mid-request
      // would unmount the only thing able to report the outcome.
      onOpenChange={(next) => {
        if (pending) return;
        if (!next) setError("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            {destructive && (
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </span>
            )}
            <div className="min-w-0 text-left">
              <AlertDialogTitle className="text-base font-semibold text-gray-900">
                {title}
              </AlertDialogTitle>
              {description && (
                <AlertDialogDescription asChild>
                  <div className="mt-1.5 text-sm text-gray-600">{description}</div>
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <AlertDialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
            className={
              destructive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-brand-blue text-white hover:opacity-90"
            }
          >
            {pending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
