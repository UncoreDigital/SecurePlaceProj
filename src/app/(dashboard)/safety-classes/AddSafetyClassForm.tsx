"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Plus, Bold, Italic, List, ListOrdered, Link } from "lucide-react";
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
  
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isEditorFocused) {
      const content = formData.description || '';
      const displayContent = content || '<span style="color: #6b7280; font-style: italic;">Enter safety class description...</span>';
      if (editorRef.current.innerHTML !== displayContent) {
        editorRef.current.innerHTML = displayContent;
      }
    }
  }, [formData.description, isEditorFocused]);

  const formatText = (command: string, value?: string) => {
    if (editorRef.current) {
      // Focus the editor first
      editorRef.current.focus();
      
      // Execute the command
      const success = document.execCommand(command, false, value);
      
      if (success) {
        // Update the form data with the new content
        const content = editorRef.current.innerHTML;
        handleInputChange("description", content);
      }
      
      // Keep focus on the editor
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 0);
    }
  };

  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      handleInputChange("description", content);
    }
  };

  const handleEditorFocus = () => {
    setIsEditorFocused(true);
    if (editorRef.current) {
      const content = editorRef.current.innerHTML.trim();
      if (content === '' || content === 'Enter safety class description...') {
        editorRef.current.innerHTML = '<p><br></p>';
        // Set cursor to the paragraph
        const range = document.createRange();
        const selection = window.getSelection();
        const p = editorRef.current.querySelector('p');
        if (p && selection) {
          range.setStart(p, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  };

  const handleEditorBlur = () => {
    setIsEditorFocused(false);
    if (editorRef.current) {
      let content = editorRef.current.innerHTML;
      // Clean up empty paragraphs and placeholder text
      if (content === '<p><br></p>' || content.trim() === '' || content.includes('Enter safety class description...')) {
        content = '';
        handleInputChange("description", content);
      } else {
        handleEditorChange({} as React.FormEvent<HTMLDivElement>);
      }
    }
  };

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
              <div className="border rounded-md">
                {/* Rich Text Editor Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('bold')}
                    className="h-8 w-8 p-0"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('italic')}
                    className="h-8 w-8 p-0"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />
                  {/* <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('insertUnorderedList')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('insertOrderedList')}
                    className="h-8 w-8 p-0"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button> */}
                  {/* <div className="w-px h-6 bg-gray-300 mx-1" /> */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = prompt('Enter URL:');
                      if (url) formatText('createLink', url);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Rich Text Editor Content */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorChange}
                  onFocus={handleEditorFocus}
                  onBlur={handleEditorBlur}
                  className="min-h-[100px] p-3 outline-none prose prose-sm max-w-none border-0 focus:ring-0 focus:border-blue-500 transition-colors"
                  style={{
                    whiteSpace: 'pre-wrap',
                  }}
                  suppressContentEditableWarning={true}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use the toolbar above to format your text with bold, italic, lists, and links.
              </p>
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
