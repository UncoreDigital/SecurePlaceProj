"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, MapPin, Phone, Mail, Calendar, Edit3, Save, X } from "lucide-react";
import { FirmAdminGuard } from "@/components/AuthGuard";

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

export default function FirmProfilePage() {
  const { user, loading: userLoading } = useUser();
  const [firmData, setFirmData] = useState<FirmProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FirmProfile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFirmData = async () => {
      if (!user?.firmId) return;

      try {
        setLoading(true);
        const supabase = createBrowserSupabase();
        
        console.log('🏢 Fetching firm data for firmId:', user.firmId);
        
        const { data, error } = await supabase
          .from("firms")
          .select("*")
          .eq("id", user.firmId)
          .single();

        if (error) {
          console.error("Failed to fetch firm data:", error);
          return;
        }

        console.log('✅ Firm data loaded:', data);
        setFirmData(data);
        setEditForm(data);
      } catch (err) {
        console.error("Error fetching firm data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading && user) {
      fetchFirmData();
    }
  }, [user, userLoading]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm(firmData || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(firmData || {});
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
        return;
      }

      // Update local state
      setFirmData({ ...firmData, ...editForm });
      setIsEditing(false);
      console.log('✅ Firm profile updated successfully');
    } catch (err) {
      console.error("Error updating firm:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof FirmProfile, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  if (userLoading || loading) {
    return (
      <FirmAdminGuard>
        <div className="container mx-auto py-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-brand-blue">Firm Profile</h1>
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </FirmAdminGuard>
    );
  }

  if (!firmData) {
    return (
      <FirmAdminGuard>
        <div className="container mx-auto py-10">
          <h1 className="text-3xl font-bold text-brand-blue mb-6">Firm Profile</h1>
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No firm data found</p>
              <p className="text-sm text-gray-500">Please contact support if this is an error.</p>
            </CardContent>
          </Card>
        </div>
      </FirmAdminGuard>
    );
  }

  return (
    <FirmAdminGuard>
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-brand-blue">Firm Profile</h1>
          {!isEditing ? (
            <label></label>
            // <Button onClick={handleEdit} className="bg-brand-blue hover:bg-brand-blue/90">
            //   <Edit3 className="h-4 w-4 mr-2" />
            //   Edit Profile
            // </Button>
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
    </FirmAdminGuard>
  );
}