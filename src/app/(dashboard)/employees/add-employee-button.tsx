"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/UserContext";
import { functions } from "@/lib/appwrite";

interface AddEmployeeButtonProps {
  onEmployeeAdded: () => void;
}

export function AddEmployeeButton({ onEmployeeAdded }: AddEmployeeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!user || !user.firmId) {
      setError("Could not identify your firm. Please try again.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      email: formData.get("officialEmail") as string,
      password: "Password@123", // Default password
      role: formData.get("role") as string,
      firmId: user.firmId,
      employeeCode: formData.get("employeeCode") as string,
    };

    if (!data.role) {
      setError("Please select a role for the new user.");
      return;
    }

    try {
      // Call the Appwrite Function, passing the data as a stringified JSON payload
      const functionId = "createUserProfile"; // <-- Paste your Function ID here
      const result = await functions.createExecution(
        functionId,
        JSON.stringify(data)
      );

      const response = JSON.parse(result.responseBody);
      if (!response.success) {
        throw new Error(response.message);
      }

      setIsOpen(false);
      onEmployeeAdded(); // Refresh the table
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fullName" className="text-right">
              Full Name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="officialEmail" className="text-right">
              Email
            </Label>
            <Input
              id="officialEmail"
              name="officialEmail"
              type="email"
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
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select name="role">
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="col-span-4 text-center text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-end mt-4">
            <Button type="submit">Create Employee</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
