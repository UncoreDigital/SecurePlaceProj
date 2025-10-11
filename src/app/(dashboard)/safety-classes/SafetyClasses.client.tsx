"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Play, Clock, Users, Filter, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddSafetyClassForm from "./AddSafetyClassForm";
import { SafetyClass } from "./types";

// Removed categories as they're not in the database schema

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

export default function SafetyClassesClient({
  safetyClasses,
  initialCategory,
  initialType,
  isSuperAdmin,
  createSafetyClass,
  updateSafetyClass,
}: {
  safetyClasses: SafetyClass[];
  initialCategory: string;
  initialType: string;
  isSuperAdmin: boolean;
  createSafetyClass: (formData: FormData) => Promise<void>;
  updateSafetyClass: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const category = sp.get("category") ?? initialCategory ?? "all";
  const type = sp.get("type") ?? initialType ?? "remote";

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingSafetyClass, setEditingSafetyClass] = useState<SafetyClass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter safety classes based on selected type
  const filteredSafetyClasses = safetyClasses.filter((safetyClass) => {
    if (type === "remote") {
      return safetyClass.mode === "Remote";
    } else if (type === "in-person") {
      return safetyClass.mode === "InPerson";
    }
    return true; // Show all if no specific type selected
  });

  const handleCategoryChange = (newCategory: string) => {
    setParams(router, pathname, sp, { category: newCategory });
  };

  const handleTypeChange = (newType: string) => {
    setParams(router, pathname, sp, { type: newType });
  };

  const handleExploreWorkshop = (safetyClass: SafetyClass) => {
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
      formData.append("type", data.type);
      formData.append("mode", data.mode);

      if (data.thumbnailUrl) {
        formData.append("thumbnailUrl", data.thumbnailUrl);
      }
      await createSafetyClass(formData);
      setIsAddFormOpen(false);
    } catch (error) {
      console.error("Error creating safety class:", error);
      setError(error instanceof Error ? error.message : "Failed to create safety class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSafetyClass = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append("id", editingSafetyClass!.id);
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("duration", data.duration.toString());
      formData.append("videoUrl", data.videoUrl);
      formData.append("isRequired", data.isRequired ? "on" : "");
      formData.append("type", data.type);
      formData.append("mode", data.mode);

      if (data.thumbnailUrl) {
        formData.append("thumbnailUrl", data.thumbnailUrl);
      }
      await updateSafetyClass(formData);
      setEditingSafetyClass(null);
    } catch (error) {
      console.error("Error updating safety class:", error);
      setError(error instanceof Error ? error.message : "Failed to update safety class");
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
              Home &gt; Safety Classes
            </nav>
            <span className="text-3xl font-bold text-brand-blue">Safety Classes</span>
            <span className="text-gray-600 mt-1 ml-2">(Plan before 2 weeks)</span>
          </div>
          {/* Add New Safety Class Button (for admins) */}

        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Button
              className="bg-brand-blue hover:bg-brand-blue/90 cursor-pointer"
              onClick={() => setIsAddFormOpen(true)}
            >
              Add New Safety Class
            </Button>
          )}
          <div className="flex w-48 bg-gray-100 rounded-lg overflow-hidden border border-[#D8D8D8]">
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${type === "remote"
                ? "bg-brand-orange text-white"
                : "text-gray-700 hover:bg-gray-200"
                }`}
              onClick={() => handleTypeChange("remote")}
            >
              Remote
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors cursor-pointer ${type === "in-person"
                ? "bg-brand-orange text-white"
                : "text-gray-700 hover:bg-gray-200"
                }`}
              onClick={() => handleTypeChange("in-person")}
            >
              In-person
            </button>
          </div>
        </div>
      </div>

      {/* Video Cards Grid */}
      {filteredSafetyClasses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {type === "remote" ? "remote" : "in-person"} safety classes found
          </h3>
          <p className="text-gray-500">
            Try switching to {type === "remote" ? "in-person" : "remote"} classes or check back later for new content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSafetyClasses.map((safetyClass, index) => (
            <Card key={safetyClass.id} className="py-0 overflow-hidden hover:shadow-lg transition-shadow gap-3">
              <div className="relative aspect-video bg-gray-100 h-40">
                {safetyClass.thumbnail_url ? (
                  <img
                    src={safetyClass.thumbnail_url}
                    alt={safetyClass.title + " thumbnail"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-2">
                        <Play className="h-8 w-8 text-white ml-1" />
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Safety Training</p>
                    </div>
                  </div>
                )}

                {/* Required badge */}
                {safetyClass.is_required && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                    Required
                  </div>
                )}
              </div>

              <CardContent className="">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {safetyClass.title}
                </h3>
                {/* s */}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <span>{safetyClass.duration_minutes} min</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={() => handleExploreWorkshop(safetyClass)}
                    variant="outline"
                    className="flex-1 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white transition-colors cursor-pointer"
                  >
                    Explore Workshop
                  </Button>
                  {isSuperAdmin && (
                    <Button
                      onClick={() => setEditingSafetyClass(safetyClass)}
                      variant="outline"
                      className="px-3 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                      title="Edit Safety Class"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Add Safety Class Form */}
      <AddSafetyClassForm
        isOpen={isAddFormOpen}
        onClose={() => {
          setIsAddFormOpen(false);
          setError(null);
        }}
        onSubmit={handleAddSafetyClass}
        isSubmitting={isSubmitting}
      />

      {/* Edit Safety Class Form */}
      {editingSafetyClass && (
        <AddSafetyClassForm
          isOpen={!!editingSafetyClass}
          onClose={() => {
            setEditingSafetyClass(null);
            setError(null);
          }}
          onSubmit={handleEditSafetyClass}
          isSubmitting={isSubmitting}
          editingSafetyClass={editingSafetyClass}
        />
      )}

    </div>
  );
}
