"use client";

import { useMemo, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { TableShell } from "../../components/admin/TableShell";
import { FormDialog } from "../../components/admin/FormDialog";
import { RowActions } from "../../components/admin/RowActions";
import { FirmFilter } from "../../components/admin/Filters";

import type { FirmOption, FirmAdminRow } from "@/lib/types";

type Actions = {
  createFirmAdmin: (formData: FormData) => void | Promise<void>;
  updateFirmAdmin: (formData: FormData) => void | Promise<void>;
  deleteFirmAdmin: (formData: FormData) => void | Promise<void>;
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

export default function FirmAdminsClient({
  admins,
  firms,
  initialQuery,
  initialFirm,
  createFirmAdmin,
  updateFirmAdmin,
  deleteFirmAdmin,
}: {
  admins: FirmAdminRow[];
  firms: FirmOption[];
  initialQuery: string;
  initialFirm: string; // "__ALL__" or firm id
  createFirmAdmin: Actions["createFirmAdmin"];
  updateFirmAdmin: Actions["updateFirmAdmin"];
  deleteFirmAdmin: Actions["deleteFirmAdmin"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const q = sp.get("q") ?? initialQuery ?? "";
  const firm = sp.get("firm") ?? initialFirm ?? "__ALL__";
  const [inputQ, setInputQ] = useState(q);
  const [firmFilter, setFirmFilter] = useState(firm || "__ALL__");

  // Columns
  const columns = useMemo<ColumnDef<FirmAdminRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "firmName", header: "Assigned Firm" },
      {
        id: "actions",
        cell: ({ row }) => {
          const admin = row.original;
          return (
            <RowActions
              editTrigger={
                <FormDialog
                  triggerLabel={
                    <span className="block px-2 py-1 text-sm cursor-pointer">Edit Admin</span>
                  }
                  title="Edit Admin"
                  description="Update admin details and firm assignment."
                  submitLabel="Save Changes"
                  onAction={updateFirmAdmin}
                  onBeforeSubmit={(fd) => fd.set("id", admin.id)}
                  successMessage="Firm admin updated"
                  errorMessage="Failed to update admin."
                >
                  <input type="hidden" name="id" value={admin.id} />
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={admin.name}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={admin.email}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Assign Firm</Label>
                    <select
                      name="firmId"
                      defaultValue={admin.firmId || ""}
                      className="col-span-3 h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {firms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormDialog>
              }
              onDeleteAction={async (fd) => {
                fd.set("id", admin.id);
                await deleteFirmAdmin(fd);
              }}
              deleteTitle="Delete admin?"
              deleteDescription="This will permanently remove the admin user and profile."
              successMessage="Firm admin deleted"
            />
          );
        },
      },
    ],
    [deleteFirmAdmin, firms, updateFirmAdmin]
  );

  useEffect(() => {
    setInputQ(q);
  }, [q]);
  useEffect(() => {
    setFirmFilter(firm || "__ALL__");
  }, [firm]);

  // Debounce URL update only for q
  useEffect(() => {
    const id = setTimeout(() => {
      if ((q || "") !== (inputQ || "")) {
        setParams(router, pathname, sp, { q: inputQ || null });
      }
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputQ]);

  // firm filter can update URL immediately (usually not typed repeatedly)
  // if you want to debounce it too, wrap similarly.
  const topLeft = (
    <FirmFilter
      value={firmFilter}
      onChange={(v) =>
        setParams(router, pathname, sp, { firm: v === "__ALL__" ? null : v })
      }
      firms={firms}
    />
  );

  // Add admin dialog (explicit firm select inside form)
  const addButton = (
    <FormDialog
      triggerLabel="Add New Admin"
      title="Add New Firm Admin"
      description="Create a new user and assign them to a firm."
      submitLabel="Create Admin"
      onAction={createFirmAdmin}
      successMessage="Firm admin created"
      errorMessage="Failed to create admin."
    >
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
        <Label htmlFor="password" className="text-right">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Assign Firm</Label>
        <select
          name="firmId"
          className="col-span-3 h-10 px-3 rounded-md border border-input bg-background text-sm"
          defaultValue={firm !== "__ALL__" ? firm : ""}
          required
        >
          {firms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
    </FormDialog>
  );

  return (
    <TableShell<FirmAdminRow, any>
      data={admins}
      columns={columns}
      emptyEmoji="👤"
      emptyMessage="No firm admins match your filters."
      topLeft={topLeft}
      topRight={addButton}
      nameFilterValue={inputQ}
      onNameFilterChange={(v) => setInputQ(v)}
    />
  );
}
