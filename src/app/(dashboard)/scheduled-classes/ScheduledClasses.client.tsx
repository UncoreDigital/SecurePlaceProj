"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Play, Clock, Users, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBrowserSupabase } from "@/lib/supabase/browser";
// import AddSafetyClassForm from "./AddSafetyClassForm";
// import { SafetyClass } from "./types";

// Removed categories as they're not in the database schema

const statusBtnStyles: Record<string, string> = {
  approved: "bg-emerald-500 text-white hover:bg-emerald-600",
  pending: "bg-yellow-400 text-white hover:bg-yellow-500",
};

const statusLabelStyles: Record<string, string> = {
  approved: "text-emerald-600",
  pending: "text-yellow-500",
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

export default function ScheduledClassesClient({
  scheduledClasses,
  initialCategory,
  initialType,
  isSuperAdmin,
}: {
  scheduledClasses: any[];
  initialCategory: string;
  initialType: string;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  // console.log(scheduledClasses)

  const category = sp.get("category") ?? initialCategory ?? "all";
  const type = sp.get("type") ?? initialType ?? "in-person";

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const handleCancel = (id: string) => setCancelId(id);

  const handleApprove = async (id: string) => {
    console.log({ id });
    setApprovingId(id);
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("scheduled_classes")
      .update({ status: "approved" })
      .eq("id", id);
    console.log({ error });
    if (error) {
      console.error("Failed to approve class:", error);
    } else {
      console.log("Class approved:", id);
      // setScheduledClasses((prev) =>
      //   prev.map((cls) =>
      //     cls.id === id ? { ...cls, status: "approved" } : cls
      //   )
      // );
    }
    setApprovingId(null);
  };

  const handleCategoryChange = (newCategory: string) => {
    setParams(router, pathname, sp, { category: newCategory });
  };

  const handleTypeChange = (newType: string) => {
    setParams(router, pathname, sp, { type: newType });
  };

  const handleExploreWorkshop = (safetyClass: any) => {
    router.push(`/safety-classes/${safetyClass.id}`);
  };

  const handleAddSafetyClass = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("duration", data.duration.toString());
      formData.append("videoUrl", data.videoUrl);
      formData.append("isRequired", data.isRequired ? "on" : "");

      if (data.thumbnailUrl) {
        formData.append("thumbnailUrl", data.thumbnail_url);
      }
      // await createSafetyClass(formData);
      setIsAddFormOpen(false);
    } catch (error) {
      console.error("Error creating safety class:", error);
      setError(error instanceof Error ? error.message : "Failed to create safety class");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="">
      {/* Filters and Toggle Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Category:</span>
          </div>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}
          <div className="mb-6">
            <nav className="text-sm text-gray-500 mb-2">
              Home &gt; Requested Classes
            </nav>
            <span className="text-3xl font-bold text-brand-blue">Requested Classes</span>
          </div>
          {/* Add New Safety Class Button (for admins) */}

        </div>
      </div>

      {/* Video Cards Grid */}
      {scheduledClasses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No safety classes found
          </h3>
          <p className="text-gray-500">
            Try adjusting your filters or check back later for new content.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {scheduledClasses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No scheduled classes found.</p>
            </div>
          ) : (
            // scheduledClasses.map((cls) => (

            <div className="grid gap-6">
              <div className="bg-white rounded-xl shadow p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 text-sm">
                        <th className="px-4 py-2 text-left font-semibold">Title</th>
                        {scheduledClasses?.map(x => x.currentUserRole)?.[0] === "super_admin" && (
                          <th className="px-4 py-2 text-left font-semibold">Firm</th>
                        )}
                        <th className="px-4 py-2 text-left font-semibold">Date</th>
                        <th className="px-4 py-2 text-left font-semibold">Time</th>
                        <th className="px-4 py-2 text-left font-semibold">Status</th>
                        {/* <th className="px-4 py-2 text-left font-semibold">Active</th> */}
                        {/* <th className="px-4 py-2 text-center font-semibold">Actions</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledClasses.map((cls, idx) => (
                        <tr
                          key={cls.firm_id || idx}
                          className="bg-white border-b hover:bg-gray-50 text-gray-700"
                        >
                          <td className="px-4 py-2">{cls.title || "-"}</td>
                          {scheduledClasses?.map(x => x.currentUserRole)?.[0] === "super_admin" && (
                            <td className="px-4 py-2">{cls.firm || "-"}</td>
                          )}

                          <td className="px-4 py-2">{cls.date || "-"}</td>
                          <td className="px-4 py-2">{cls.time || "-"}</td>
                          <td className="gap-2 mt-2">
                            <Button
                              className={`flex-1 ${statusBtnStyles[cls.status]}`} style={{ padding: '0px 9px' }}
                              disabled={cls.status === "approved" || approvingId === cls.id || cls.status === "cancelled"}
                              onClick={cls.status === "pending" ? () => handleApprove(cls.id) : undefined}
                            >
                              {approvingId === cls.id
                                ? "Approving..."
                                : cls.status === "approved"
                                  ? "Approved"
                                  : cls.status === "pending"
                                    ? "Pending"
                                    : cls.status === "cancelled"
                                      ? "Cancelled"
                                      : ""}
                            </Button>
                            {/* {cls.status || "—"} */}
                          </td>
                          {/* <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${location.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                }`}>
                                {location.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td> */}
                          {/* <td className="px-4 py-2">
                          <div className="flex gap-2 justify-center">
                            {user.role === "firm_admin" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(location)}
                                  className="h-8 w-8 p-0"
                                  title="Edit Location"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(location)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Location"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-gray-500 text-sm">View Only</span>
                            )}
                          </div>
                        </td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination placeholder */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    Showing {scheduledClasses.length} of {scheduledClasses.length} classes
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">Page 1 of 1</span>
                  </div>
                </div>
              </div>
            </div>

            // )
          )
          }
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Add Safety Class Form */}
      {/* <AddSafetyClassForm
        isOpen={isAddFormOpen}
        onClose={() => {
          setIsAddFormOpen(false);
          setError(null);
        }}
        onSubmit={handleAddSafetyClass}
        isSubmitting={isSubmitting}
      /> */}


    </div>
  );
}
