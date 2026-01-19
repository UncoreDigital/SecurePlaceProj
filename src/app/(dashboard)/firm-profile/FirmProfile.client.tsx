"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building, MapPin, Phone, Mail, Calendar, Save, X } from "lucide-react";

interface FirmProfile {
  id: string;
  name: string;
  industry: string;
  contact_email: string;
  phone_number: string;
  address: string;
  created_at: string;
  description?: string;
  website?: string;
}

interface FirmProfileClientProps {
  initialFirmData: FirmProfile;
  userRole: string;
  userId: string;
}

export default function FirmProfileClient({ 
  initialFirmData, 
  userRole, 
  userId 
}: FirmProfileClientProps) {
  const [firmData, setFirmData] = useState<FirmProfile>(initialFirmData);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FirmProfile>>(initialFirmData);
  const [saving, setSaving] = useState(false);

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(firmData);
  };

  const handleSave = async () => {
    if (!firmData?.id) return;

    try {
      setSaving(true);
      const supabase = createBrowserSupabase();

      const { error } = await supabase
        .from("firms")
        .update({
          name: editForm.name,
          industry: editForm.industry,
          contact_email: editForm.contact_email,
          phone_number: editForm.phone_number,
          address: editForm.address,
          description: editForm.description,
          website: editForm.website,
        })
        .eq("id", firmData.id);

      if (error) {
        console.error("Failed to update firm:", error);
        alert("Failed to update firm profile. Please try again.");
        return;
      }

      // Update local state
      const updatedFirmData = { ...firmData, ...editForm };
      setFirmData(updatedFirmData);
      setIsEditing(false);
      console.log('✅ Firm profile updated successfully');
      alert("Firm profile updated successfully!");
    } catch (err) {
      console.error("Error updating firm:", err);
      alert("An error occurred while updating the firm profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof FirmProfile, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand-blue">Firm Profile</h1>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-brand-blue hover:bg-brand-blue/90"
            >
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-brand-blue" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Firm Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={editForm.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-lg font-semibold">{firmData.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              {isEditing ? (
                <Input
                  id="industry"
                  value={editForm.industry || ""}
                  onChange={(e) => handleInputChange("industry", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1">{firmData.industry}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  value={editForm.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              ) : (
                <p className="mt-1">{firmData.description || "No description provided"}</p>
              )}
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              {isEditing ? (
                <Input
                  id="website"
                  value={editForm.website || ""}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  className="mt-1"
                  placeholder="https://example.com"
                />
              ) : (
                <p className="mt-1">
                  {firmData.website ? (
                    <a
                      href={firmData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-blue hover:text-brand-orange transition-colors"
                    >
                      {firmData.website}
                    </a>
                  ) : (
                    "No website provided"
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-brand-orange" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contact_email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              {isEditing ? (
                <Input
                  id="contact_email"
                  type="email"
                  value={editForm.contact_email || ""}
                  onChange={(e) => handleInputChange("contact_email", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1">
                  <a
                    href={`mailto:${firmData.contact_email}`}
                    className="text-brand-blue hover:text-brand-orange transition-colors"
                  >
                    {firmData.contact_email}
                  </a>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone_number" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              {isEditing ? (
                <Input
                  id="phone_number"
                  value={editForm.phone_number || ""}
                  onChange={(e) => handleInputChange("phone_number", e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1">
                  <a
                    href={`tel:${firmData.phone_number}`}
                    className="text-brand-blue hover:text-brand-orange transition-colors"
                  >
                    {firmData.phone_number}
                  </a>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </Label>
              {isEditing ? (
                <Textarea
                  id="address"
                  value={editForm.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              ) : (
                <p className="mt-1 whitespace-pre-line">{firmData.address}</p>
              )}
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created Date
              </Label>
              <p className="mt-1">
                {new Date(firmData.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}