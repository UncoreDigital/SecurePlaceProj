"use client";

import { useMemo, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";
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

  // Render Firm Admins Table with custom styling similar to Locations
  const renderTable = () => {
    return (
      <div className="grid gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm">
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Email</th>
                  <th className="px-4 py-2 text-left font-semibold">Assigned Firm</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin, idx) => (
                  <tr
                    key={admin.id || idx}
                    className="bg-white border-b hover:bg-gray-50 text-gray-700"
                  >
                    <td className="px-4 py-2 font-medium">{admin.name}</td>
                    <td className="px-4 py-2">{admin.email}</td>
                    <td className="px-4 py-2">{admin.firmName || "—"}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 justify-center">
                        <FormDialog
                          triggerLabel={
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs"
                            >
                              Edit
                            </Button>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const formData = new FormData();
                            formData.set("id", admin.id);
                            await deleteFirmAdmin(formData);
                          }}
                          className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination placeholder */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              Showing {admins.length} of {admins.length} firm admins
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
    <div>
      <div className="flex flex-col gap-4 mb-6">
        {/* Header with count and actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {admins.length} firm admin{admins.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex gap-2">
            {addButton}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4 items-center">
          <div className="relative max-w-md flex-1">
            <Input
              placeholder="Search admins by name or email..."
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              className="pl-4 pr-4"
            />
          </div>
          {topLeft}
        </div>
      </div>

      {admins.length > 0 ? (
        renderTable()
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No firm admins found
          </h3>
          <p className="text-gray-500">
            Get started by adding your first firm administrator.
          </p>
        </div>
      )}
    </div>
  );
}
