"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Play, Clock, Users, Filter, Calendar, Pencil, X, Check, Eye, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function CancelModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/70">
      <div className="bg-white rounded-xl p-10 flex flex-col items-center shadow-lg min-w-[350px]">
        <Trash2 className="w-16 h-16 text-brand-orange mb-4" />
        <div className="text-lg font-medium mb-6 text-center">
          Are you sure cancel this classes
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="min-w-[70px]" onClick={onClose}>
            No
          </Button>
          <Button className="bg-brand-orange min-w-[70px]" onClick={onConfirm}>
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApprovalModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/70">
      <div className="bg-white rounded-xl p-10 flex flex-col items-center shadow-lg min-w-[350px]">
        <Check className="w-16 h-16 text-green-500 mb-4" />
        <div className="text-lg font-medium mb-6 text-center">
          Are you sure you want to approve this class?
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="min-w-[70px]" 
            onClick={onClose}
            disabled={loading}
          >
            No
          </Button>
          <Button 
            className="bg-green-500 hover:bg-green-600 min-w-[70px]" 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Approving..." : "Yes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledClassesClient({
  scheduledClasses,
  initialCategory,
  initialType,
  isSuperAdmin,
  approveScheduledClass,
  cancelScheduledClass,
  updateScheduledClassStatus
}: {
  scheduledClasses: any[];
  initialCategory: string;
  initialType: string;
  isSuperAdmin: boolean;
  approveScheduledClass: (scheduledClassId: string) => Promise<{ success: boolean }>;
  cancelScheduledClass: (scheduledClassId: string) => Promise<{ success: boolean }>;
  updateScheduledClassStatus: (scheduledClassId: string, newStatus: string) => Promise<{ success: boolean }>;
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
  const [approveId, setApproveId] = useState<string | null>(null);
  
  // ✅ Add state for inline status editing
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  
  const handleCancel = (id: string) => setCancelId(id);
  const handleClose = () => setCancelId(null);
  const handleApproveClick = (id: string) => setApproveId(id);
  const handleApproveClose = () => setApproveId(null);

  const handleConfirm = async () => {
    if (!cancelId) return;
    setCancellingId(cancelId);
    try {
      const result = await cancelScheduledClass(cancelId);
      if (!result.success) {
        console.error("Failed to cancel class");
      }
    } catch (error) {
      console.error("Failed to cancel class:", error);
    } finally {
      setCancellingId(null);
      setCancelId(null);
    }
  };

  const handleApproveConfirm = async () => {
    if (!approveId) return;
    console.log('🔄 Starting approval process for class ID:', approveId);
    setApprovingId(approveId);
    setError(null);

    try {
      const result = await approveScheduledClass(approveId);

      if (result.success) {
        console.log('✅ Class approved successfully:', approveId);
        // The page will be revalidated by the server action, so the UI will update automatically
      }
    } catch (error) {
      console.error('❌ Failed to approve class:', error);
      setError(error instanceof Error ? error.message : 'Failed to approve class');
    } finally {
      setApprovingId(null);
      setApproveId(null);
    }
  };

  // ✅ Handle inline status updates
  const handleStatusUpdate = async (classId: string, newStatus: string) => {
    setUpdatingStatusId(classId);
    setError(null);

    try {
      const result = await updateScheduledClassStatus(classId, newStatus);

      if (result.success) {
        console.log('✅ Status updated successfully:', classId, 'to', newStatus);
        setEditingStatusId(null);
        // The page will be revalidated by the server action, so the UI will update automatically
      }
    } catch (error) {
      console.error('❌ Failed to update status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ✅ Handle status edit click
  const handleStatusEditClick = (classId: string) => {
    console.log('🔄 Status edit clicked for class:', classId);
    console.log('🔍 Current editingStatusId:', editingStatusId);
    
    if (editingStatusId === classId) {
      console.log('❌ Closing edit mode');
      setEditingStatusId(null); // Close if already editing
    } else {
      console.log('✅ Opening edit mode');
      setEditingStatusId(classId); // Open for editing
    }
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
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-brand-blue">Requested Classes</span>
              {/* ✅ Debug button to test state */}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  console.log('🔍 Current editingStatusId:', editingStatusId);
                  setEditingStatusId(editingStatusId ? null : 'test-id');
                }}
              >
                Toggle Edit (Debug)
              </Button>
            </div>
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
                        <th className="px-4 py-2 text-left font-semibold">Location</th>
                        <th className="px-4 py-2 text-left font-semibold">Date</th>
                        <th className="px-4 py-2 text-left font-semibold">Time</th>
                        <th className="px-4 py-2 text-left font-semibold">Status</th>
                        <th className="px-4 py-2 text-left font-semibold">Actions</th>
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
                          <td className="px-4 py-2">
                            <div>
                              <div className="font-medium">{cls.location || "Remote"}</div>
                              {(cls.creatorDetails?.email || cls.creatorDetails?.phone) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {cls.creatorDetails?.email && cls.creatorDetails?.phone ? (
                                    <span>({cls.creatorDetails.email} - {cls.creatorDetails.phone})</span>
                                  ) : (
                                    <span>({cls.creatorDetails?.email || cls.creatorDetails?.phone})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-2">{cls.date || "-"}</td>
                          <td className="px-4 py-2">{cls.time || "-"}</td>
                          <td className="px-4 py-2">
                            {/* ✅ Inline Status Editing */}
                            {editingStatusId === cls.id ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={cls.status}
                                  onValueChange={(newStatus) => handleStatusUpdate(cls.id, newStatus)}
                                  disabled={updatingStatusId === cls.id}
                                >
                                  <SelectTrigger className="w-32 h-8 text-xs border-2 border-blue-500">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-50">
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingStatusId(null)}
                                  className="h-6 w-6 p-0"
                                  disabled={updatingStatusId === cls.id}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  className={`cursor-pointer text-xs px-2 py-1 h-7 ${statusBtnStyles[cls.status]} ${editingStatusId === cls.id ? 'ring-2 ring-blue-500' : ''}`}
                                  onClick={() => handleStatusEditClick(cls.id)}
                                  disabled={updatingStatusId === cls.id}
                                >
                                  {updatingStatusId === cls.id
                                    ? "Approving..."
                                    : cls.status === "approved"
                                      ? "Approved"
                                      : cls.status === "pending"
                                        ? "Pending"
                                          : cls.status === "cancelled"
                                            ? "Cancelled"
                                            : cls.status || "Unknown"}
                                </Button>
                                {/* ✅ Always show edit icon for debugging */}
                                <ChevronDown 
                                  className="h-3 w-3 text-gray-400 cursor-pointer hover:text-gray-600" 
                                  onClick={() => handleStatusEditClick(cls.id)}
                                  title="Click to edit status"
                                />
                                {/* ✅ Show current editing state */}
                                {editingStatusId === cls.id && (
                                  <span className="text-xs text-blue-600 font-medium">EDITING</span>
                                )}
                              </div>
                            )}
                          </td>
                          {/* <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${location.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                }`}>
                                {location.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td> */}
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              {/* View button - available for all users */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/safety-classes/${cls?.safetyClassId}`)}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50 cursor-pointer"
                                title="View Class Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {cls.currentUserRole === "super_admin" && cls.status === "pending" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApproveClick(cls.id)}
                                    disabled={cls.status === "approved" || approvingId === cls.id || cls.status === "cancelled"}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                                    title="Approve Class"
                                  >
                                    {approvingId === cls.id ? (
                                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                    ) : (
                                      <Check className="h-5 w-5 stroke-[2.5]" style={{ color: "#00bc7d" }} />
                                    )}
                                  </Button>

                                </>
                              ) : (
                                <></>
                                // <span className="text-gray-500 text-sm">View Only</span>
                              )}
                              {cls.status === "pending" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancel(cls.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                  title="Cancel Class"
                                >
                                  <X className="h-5 w-5 stroke-[2.5]" />
                                </Button>
                              ) : (
                                <></>
                              )}
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

      <CancelModal
        open={!!cancelId}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />

      <ApprovalModal
        open={!!approveId}
        onClose={handleApproveClose}
        onConfirm={handleApproveConfirm}
        loading={approvingId === approveId}
      />
    </div>
  );
}
