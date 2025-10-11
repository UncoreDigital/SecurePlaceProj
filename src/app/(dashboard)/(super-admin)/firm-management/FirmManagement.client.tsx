"use client";

import { useMemo, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";
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
  // Render Firms Table with custom styling similar to Locations
  const renderTable = () => {
    return (
      <div className="grid gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm">
                  <th className="px-4 py-2 text-left font-semibold">Firm Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Industry</th>
                  <th className="px-4 py-2 text-left font-semibold">Contact Email</th>
                  <th className="px-4 py-2 text-left font-semibold">Phone Number</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {firms.map((firm, idx) => (
                  <tr
                    key={firm.id || idx}
                    className="bg-white border-b hover:bg-gray-50 text-gray-700"
                  >
                    <td className="px-4 py-2 font-medium">{firm.name}</td>
                    <td className="px-4 py-2">{firm.industry || "—"}</td>
                    <td className="px-4 py-2">{firm.contactEmail || "—"}</td>
                    <td className="px-4 py-2">{firm.phoneNumber || "—"}</td>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const formData = new FormData();
                            formData.set("id", firm.id);
                            await deleteFirm(formData);
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
              Showing {firms.length} of {firms.length} firms
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  // Add New Firm Dialog
  const addButton = (
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
  );

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        {/* Header with count and actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {firms.length} firm{firms.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex gap-2">
            {addButton}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Input
            placeholder="Search firms by name, industry, or email..."
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            className="pl-4 pr-4"
          />
        </div>
      </div>

      {firms.length > 0 ? (
        renderTable()
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No firms found
          </h3>
          <p className="text-gray-500">
            Get started by creating your first firm.
          </p>
        </div>
      )}
    </div>
  );
}
