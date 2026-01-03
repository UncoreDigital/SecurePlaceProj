"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";

export function RowActions({
  editTrigger,
  onDeleteAction,
  deleteTitle = "Delete item?",
  deleteDescription = "This action cannot be undone.",
  deleteButtonLabel = "Delete",
  submitLabel = "Continue",
  successMessage = "Deleted",
  errorMessage = "Delete failed. Please try again.",
}: {
  editTrigger?: React.ReactNode; // e.g. <EditButton>{menu item}</EditButton>
  onDeleteAction?: (fd: FormData) => Promise<void> | void; // server action handler
  deleteTitle?: string;
  deleteDescription?: string;
  deleteButtonLabel?: string;
  submitLabel?: string;
  successMessage?: string;
  errorMessage?: string;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          {editTrigger ? (
            <>
              {editTrigger}
              <DropdownMenuSeparator />
            </>
          ) : null}

          {onDeleteAction ? (
            <AlertDialogTrigger asChild>
              <DropdownMenuItem className="text-red-500 hover:!text-red-500 hover:!bg-red-100">
                {deleteButtonLabel}
              </DropdownMenuItem>
            </AlertDialogTrigger>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDeleteAction ? (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <form
              action={async (fd) => {
                setDeleting(true);
                try {
                  await onDeleteAction(fd);
                  toast.success(successMessage);
                } catch {
                  toast.error(errorMessage);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                type="submit"
                disabled={deleting}
              >
                {deleting ? "Working…" : submitLabel}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}
