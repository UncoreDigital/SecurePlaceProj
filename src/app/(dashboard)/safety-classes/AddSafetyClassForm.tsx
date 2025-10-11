"use client";

import { useState } from "react";
import { X, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SafetyClassFormData } from "./types";
import { uploadImageToSupabase } from "@/lib/supabase/browser";

interface AddSafetyClassFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SafetyClassFormData) => void;
  isSubmitting?: boolean;
}

// Removed categories as they're not in the database schema

export default function AddSafetyClassForm({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddSafetyClassFormProps) {
  const [formData, setFormData] = useState<SafetyClassFormData>({
    title: "",
    description: "",
    duration: 0,
    videoUrl: "",
    isRequired: false,
    thumbnailUrl: "",
    type: "Safety Class",
    mode: "Remote",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      title: "",
      description: "",
      duration: 0,
      videoUrl: "",
      isRequired: false,
      thumbnailUrl: "",
      type: "Safety Class",
      mode: "Remote",
    });
    onClose();
  };

  const handleInputChange = (
    field: keyof SafetyClassFormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Add New Safety Class</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter safety class title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter safety class description"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => handleInputChange("duration", parseInt(e.target.value) || 0)}
                  placeholder="Enter duration in minutes"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value as "Safety Class" | "Drill")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Safety Class">Safety Class</SelectItem>
                    <SelectItem value="Drill">Drill</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mode">Mode *</Label>
                <Select
                  value={formData.mode}
                  onValueChange={(value) => handleInputChange("mode", value as "Remote" | "InPerson")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="InPerson">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL *</Label>
              <Input
                id="videoUrl"
                type="url"
                value={formData.videoUrl}
                onChange={(e) => handleInputChange("videoUrl", e.target.value)}
                placeholder="Enter video URL (MP4, WebM, etc.)"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnailUpload">Thumbnail Image Upload</Label>
              <Input
                id="thumbnailUpload"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Show local preview
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleInputChange("thumbnailUrl", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                    // Upload to Supabase Storage
                    try {
                      const publicUrl = await uploadImageToSupabase(file);
                      handleInputChange("thumbnailUrl", publicUrl);
                    } catch (err) {
                      // alert("Image upload failed");
                    }
                  }
                }}
              />
              {formData.thumbnailUrl && (
                <img src={formData.thumbnailUrl} alt="Thumbnail Preview" className="mt-2 max-h-32 rounded border" />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="isRequired"
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) => handleInputChange("isRequired", e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isRequired">Required Training</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand-blue hover:bg-brand-blue/90"
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isSubmitting ? "Adding..." : "Add Safety Class"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
