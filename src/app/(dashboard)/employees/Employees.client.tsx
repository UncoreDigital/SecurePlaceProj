"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { TableShell } from "../components/admin/TableShell";
import { RowActions } from "../components/admin/RowActions";
import { FormDialog } from "../components/admin/FormDialog";
import { FirmFilter } from "../components/admin/Filters";

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  employeeCode: string | null;
  contactNumber: string | null;
  isVolunteer: boolean;
  firmId: string | null;
  firmName: string;
};
type FirmOption = { id: string; name: string };

type Actions = {
  createEmployee: (formData: FormData) => void | Promise<void>;
  updateEmployee: (formData: FormData) => void | Promise<void>;
  deleteEmployee: (formData: FormData) => void | Promise<void>;
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

export default function EmployeesClient({
  employees,
  firms,
  isSuperAdmin,
  initialQuery,
  initialFirm,
  createEmployee,
  updateEmployee,
  deleteEmployee,
}: {
  employees: EmployeeRow[];
  firms: FirmOption[];
  isSuperAdmin: boolean;
  initialQuery: string;
  initialFirm: string;
  createEmployee: Actions["createEmployee"];
  updateEmployee: Actions["updateEmployee"];
  deleteEmployee: Actions["deleteEmployee"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const q = sp.get("q") ?? initialQuery ?? "";
  const [inputQ, setInputQ] = useState(q);
  useEffect(() => setInputQ(q), [q]);
  useEffect(() => {
    const id = setTimeout(() => {
      if ((q || "") !== (inputQ || "")) {
        setParams(router, pathname, sp, { q: inputQ || null });
      }
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputQ]);

  const firmParam = sp.get("firm") ?? initialFirm ?? "__ALL__";
  const firmValue = isSuperAdmin ? firmParam : initialFirm;

  const topLeft = isSuperAdmin ? (
    <FirmFilter
      value={firmValue}
      onChange={(v) =>
        setParams(router, pathname, sp, { firm: v === "__ALL__" ? null : v })
      }
      firms={firms}
    />
  ) : null;

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Full Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      { accessorKey: "employeeCode", header: "Employee Code" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "contactNumber", header: "Contact" },
      {
        accessorKey: "isVolunteer",
        header: "Volunteer",
        cell: ({ row }) => (row.original.isVolunteer ? "Yes" : "No"),
      },
      { accessorKey: "firmName", header: "Firm" },
      {
        id: "actions",
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <RowActions
              editTrigger={
                <FormDialog
                  triggerLabel={
                    <span className="block px-2 py-1 text-sm cursor-pointer">
                      Edit Employee
                    </span>
                  }
                  title="Edit Employee"
                  description="Update employee details."
                  submitLabel="Save Changes"
                  onAction={updateEmployee}
                  onBeforeSubmit={(fd) => fd.set("id", emp.id)}
                  successMessage="Employee updated"
                  errorMessage="Failed to update employee."
                >
                  <input type="hidden" name="id" value={emp.id} />
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={emp.name}
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
                      defaultValue={emp.email}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="employeeCode" className="text-right">
                      Emp Code
                    </Label>
                    <Input
                      id="employeeCode"
                      name="employeeCode"
                      defaultValue={emp.employeeCode ?? ""}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contactNumber" className="text-right">
                      Contact
                    </Label>
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      defaultValue={emp.contactNumber ?? ""}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      className="text-right"
                      htmlFor={`isVolunteer-${emp.id}`}
                    >
                      Volunteer
                    </Label>
                    <input
                      id={`isVolunteer-${emp.id}`}
                      name="isVolunteer"
                      type="checkbox"
                      defaultChecked={emp.isVolunteer}
                      className="col-span-3 h-4 w-4 accent-brand-blue"
                    />
                  </div>
                  {isSuperAdmin ? (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Assign Firm</Label>
                      <select
                        name="firmId"
                        defaultValue={emp.firmId || ""}
                        className="col-span-3 h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        {firms.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </FormDialog>
              }
              onDeleteAction={async (fd) => {
                fd.set("id", emp.id);
                await deleteEmployee(fd);
              }}
              deleteTitle="Delete employee?"
              deleteDescription="This will remove the employee user and profile."
              successMessage="Employee deleted"
            />
          );
        },
      },
    ],
    [deleteEmployee, firms, isSuperAdmin, updateEmployee]
  );

  const addButton = (
    <FormDialog
      triggerLabel="Add Employee"
      title="Add New Employee"
      description="Create a new employee user."
      submitLabel="Create Employee"
      onAction={createEmployee}
      successMessage="Employee created"
      errorMessage="Failed to create employee."
    >
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Full Name
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
        <Label htmlFor="employeeCode" className="text-right">
          Emp Code
        </Label>
        <Input id="employeeCode" name="employeeCode" className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="contactNumber" className="text-right">
          Contact
        </Label>
        <Input id="contactNumber" name="contactNumber" className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right" htmlFor="isVolunteer">
          Volunteer
        </Label>
        <input
          id="isVolunteer"
          name="isVolunteer"
          type="checkbox"
          className="col-span-3 h-4 w-4 accent-brand-blue"
        />
      </div>
      {isSuperAdmin ? (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">Assign Firm</Label>
          <select
            name="firmId"
            defaultValue={firmValue !== "__ALL__" ? firmValue : ""}
            className="col-span-3 h-10 px-3 rounded-md border border-input bg-background text-sm"
            required
          >
            {firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </FormDialog>
  );

  return (
    <TableShell<EmployeeRow, any>
      data={employees}
      columns={columns}
      emptyEmoji="🧑‍💼"
      emptyMessage="No employees found."
      topLeft={topLeft}
      topRight={addButton}
      nameFilterValue={inputQ}
      onNameFilterChange={(v) => setInputQ(v)}
    />
  );
}
