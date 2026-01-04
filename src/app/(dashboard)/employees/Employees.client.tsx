"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, X, Plus, Pencil, Trash2 } from "lucide-react";

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
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Filter employees based on search query and firm
  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    
    // Apply search filter
    if (inputQ.trim()) {
      const query = inputQ.toLowerCase();
      filtered = filtered.filter(employee => 
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.employeeCode?.toLowerCase().includes(query) ||
        employee.contactNumber?.toLowerCase().includes(query) ||
        employee.firmName.toLowerCase().includes(query)
      );
    }
    
    // Apply firm filter for super admin
    if (isSuperAdmin && firmValue && firmValue !== "__ALL__") {
      filtered = filtered.filter(employee => employee.firmId === firmValue);
    }
    
    return filtered;
  }, [employees, inputQ, isSuperAdmin, firmValue]);

  const handleEdit = (employee: EmployeeRow) => {
    setEditingEmployee(employee);
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
  };

  const handleSaveEdit = async (formData: FormData) => {
    if (!editingEmployee) return;

    setIsSubmitting(true);
    formData.append("id", editingEmployee.id);

    try {
      await updateEmployee(formData);
      handleCancelEdit();
      // Refresh page to get updated data
      window.location.reload();
    } catch (error) {
      console.error("Failed to update employee:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employee: EmployeeRow) => {
    setDeletingEmployee(employee);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("id", deletingEmployee.id);

    try {
      await deleteEmployee(formData);
      setDeletingEmployee(null);
      // Refresh page to get updated data
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete employee:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingEmployee(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        {/* Header with count and actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {inputQ ? (
              <>
                {filteredEmployees.length} of {employees.length} employee{employees.length !== 1 ? 's' : ''}
                {filteredEmployees.length !== employees.length && (
                  <span className="text-blue-600 ml-1">(filtered)</span>
                )}
              </>
            ) : (
              <>
                {employees.length} employee{employees.length !== 1 ? 's' : ''} found
              </>
            )}
          </div>
          <div className="flex gap-2">
            <FormDialog
              triggerLabel={
                <Button className="bg-brand-blue hover:bg-brand-blue/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              }
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
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search employees by name, email, code, or firm..."
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              className="pl-10 pr-4"
            />
            {inputQ && (
              <button
                onClick={() => setInputQ("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isSuperAdmin && (
            <FirmFilter
              value={firmValue}
              onChange={(v) =>
                setParams(router, pathname, sp, { firm: v === "__ALL__" ? null : v })
              }
              firms={firms}
            />
          )}
        </div>
      </div>

      {filteredEmployees.length > 0 ? (
        <div className="grid gap-6">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm">
                    <th className="px-4 py-2 text-left font-semibold">Full Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Employee Code</th>
                    <th className="px-4 py-2 text-left font-semibold">Email</th>
                    <th className="px-4 py-2 text-left font-semibold">Contact</th>
                    <th className="px-4 py-2 text-left font-semibold">Volunteer</th>
                    <th className="px-4 py-2 text-left font-semibold">Firm</th>
                    <th className="px-4 py-2 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee, idx) => (
                    <tr
                      key={employee.id || idx}
                      className="bg-white border-b hover:bg-gray-50 text-gray-700"
                    >
                      <td className="px-4 py-2 font-medium">{employee.name}</td>
                      <td className="px-4 py-2">{employee.employeeCode || "—"}</td>
                      <td className="px-4 py-2">{employee.email}</td>
                      <td className="px-4 py-2">{employee.contactNumber || "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          employee.isVolunteer 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {employee.isVolunteer ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-2">{employee.firmName || "—"}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(employee)}
                            className="h-8 w-8 p-0"
                            title="Edit Employee"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(employee)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Employee"
                          >
                            <Trash2 className="h-4 w-4" />
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
                Showing {filteredEmployees.length} of {employees.length} employees
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-lg">
          {employees.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold">No employees found.</h2>
              <p className="text-slate-500 mt-2">
                Get started by adding your first employee.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">No employees match your search.</h2>
              <p className="text-slate-500 mt-2">
                Try adjusting your search terms or{" "}
                <button
                  onClick={() => setInputQ("")}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  clear search
                </button>
                .
              </p>
            </>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-blue">Edit Employee</h2>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSaveEdit(formData);
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingEmployee.name}
                    placeholder="Enter full name"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={editingEmployee.email}
                    placeholder="Enter email address"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-employeeCode">Employee Code</Label>
                  <Input
                    id="edit-employeeCode"
                    name="employeeCode"
                    defaultValue={editingEmployee.employeeCode || ""}
                    placeholder="Enter employee code"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-contactNumber">Contact Number</Label>
                  <Input
                    id="edit-contactNumber"
                    name="contactNumber"
                    defaultValue={editingEmployee.contactNumber || ""}
                    placeholder="Enter contact number"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="edit-isVolunteer"
                    name="isVolunteer"
                    type="checkbox"
                    defaultChecked={editingEmployee.isVolunteer}
                    className="h-4 w-4 accent-brand-blue"
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="edit-isVolunteer">Is Volunteer</Label>
                </div>

                {isSuperAdmin && (
                  <div>
                    <Label htmlFor="edit-firmId">Assign Firm</Label>
                    <select
                      id="edit-firmId"
                      name="firmId"
                      defaultValue={editingEmployee.firmId || ""}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      disabled={isSubmitting}
                    >
                      {firms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-brand-blue hover:bg-brand-blue/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Employee</h2>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete "{deletingEmployee.name}"?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. The employee will be permanently removed.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCancelDelete}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Employee
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
