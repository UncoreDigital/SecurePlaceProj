"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Models } from "appwrite";
// Actions column will be added in a later step

// Defines the shape of our employee data from user_profiles
export interface Employee extends Models.Document {
  fullName: string;
  employeeCode: string;
  officialEmail: string;
  contactNumber: string;
  role: string;
}

export const columns: ColumnDef<Employee>[] = [
  { accessorKey: "fullName", header: "Full Name" },
  { accessorKey: "employeeCode", header: "Employee Code" },
  { accessorKey: "officialEmail", header: "Email" },
  { accessorKey: "contactNumber", header: "Contact" },
  { accessorKey: "role", header: "Role" },
  // Actions column will go here
];
