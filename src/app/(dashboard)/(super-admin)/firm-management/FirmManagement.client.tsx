"use client";

import { useMemo, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { TableShell } from "../../components/admin/TableShell";
import { RowActions } from "../../components/admin/RowActions";
import { FormDialog } from "../../components/admin/FormDialog";

import type { Firm } from "@/lib/types";

type Actions = {
  createFirm: (formData: FormData) => void | Promise<void>;
  updateFirm: (formData: FormData) => void | Promise<void>;
  deleteFirm: (formData: FormData) => void | Promise<void>;
};

function setParams(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: URLSearchParams,
  updates: Record<string, string | null>
) {
  const sp = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([k, v]) => {
    if (v === null || v === "") sp.delete(k);
    else sp.set(k, v);
  });
  router.replace(`${pathname}?${sp.toString()}`);
}

export default function FirmManagement({
  firms,
  initialQuery,
  createFirm,
  updateFirm,
  deleteFirm,
}: {
  firms: Firm[];
  initialQuery: string;
  createFirm: Actions["createFirm"];
  updateFirm: Actions["updateFirm"];
  deleteFirm: Actions["deleteFirm"];
}) {
  const columns = useMemo<ColumnDef<Firm>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Firm Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      { accessorKey: "industry", header: "Industry" },
      { accessorKey: "contactEmail", header: "Contact Email" },
      { accessorKey: "phoneNumber", header: "Phone Number" },
      {
        id: "actions",
        cell: ({ row }) => {
          const firm = row.original;
          return (
            <RowActions
              editTrigger={
                <FormDialog
                  triggerLabel={
                    <span className="block px-2 py-1 text-sm cursor-pointer">Edit Firm</span>
                  }
                  title="Edit Firm"
                  description={`Update ${firm.name}`}
                  submitLabel="Save Changes"
                  onAction={updateFirm}
                  onBeforeSubmit={(fd) => fd.set("id", firm.id)}
                  successMessage="Firm updated"
                  errorMessage="Failed to update firm."
                >
                  <input type="hidden" name="id" value={firm.id} />
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={firm.name}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="industry" className="text-right">
                      Industry
                    </Label>
                    <Input
                      id="industry"
                      name="industry"
                      defaultValue={firm.industry || ""}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contactEmail" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      defaultValue={firm.contactEmail || ""}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phoneNumber" className="text-right">
                      Phone
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      defaultValue={firm.phoneNumber || ""}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="address" className="text-right">
                      Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={firm.address || ""}
                      className="col-span-3"
                    />
                  </div>
                </FormDialog>
              }
              onDeleteAction={async (fd) => {
                fd.set("id", firm.id);
                await deleteFirm(fd);
              }}
              deleteTitle="Delete firm?"
              deleteDescription="This will permanently delete the firm and all related data."
              successMessage="Firm deleted"
            />
          );
        },
      },
    ],
    [deleteFirm, updateFirm]
  );

  // URL sync for ?q=
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q") ?? initialQuery ?? "";
  const [inputQ, setInputQ] = useState(q);

  useEffect(() => {
    setInputQ(q);
  }, [q]);

  // Debounce URL update (fires after user pauses typing)
  useEffect(() => {
    const id = setTimeout(() => {
      if ((q || "") !== (inputQ || "")) {
        setParams(router, pathname, sp, { q: inputQ || null });
      }
    }, 500); // adjust debounce as you like (300–600ms)
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputQ]);

  return (
    <TableShell<Firm, any>
      data={firms}
      columns={columns}
      emptyEmoji="🏢"
      emptyMessage="No firms yet. Create your first one."
      nameFilterValue={inputQ}
      onNameFilterChange={(v) => setInputQ(v)}
      topRight={
        <FormDialog
          triggerLabel="Add New Firm"
          title="Add New Firm"
          description="Enter the details for the new firm."
          submitLabel="Save Firm"
          onAction={createFirm}
          successMessage="Firm created"
          errorMessage="Failed to create firm."
        >
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
        </FormDialog>
      }
    />
  );
}
