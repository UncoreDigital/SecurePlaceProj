"use client";

import { useState, useMemo } from "react";
import { useUser } from "@/hooks/useUser";
import { Location } from "./columns";
import LocationCard from "./LocationCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddLocationButton } from "./add-location-button";
import { Edit3, Trash2, X, Save, Search } from "lucide-react";

interface LocationsClientProps {
  locations: Location[];
  createLocation: (formData: FormData) => Promise<void>;
  updateLocation: (formData: FormData) => Promise<void>;
  deleteLocation: (formData: FormData) => Promise<void>;
}

export default function LocationsClient({
  locations,
  createLocation,
  updateLocation,
  deleteLocation,
}: LocationsClientProps) {
  const { user } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    description: "",
    latitude: 0,
    longitude: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    
    const query = searchQuery.toLowerCase();
    return locations.filter(location => 
      location.name.toLowerCase().includes(query) ||
      location.address.toLowerCase().includes(query) ||
      location.description?.toLowerCase().includes(query) ||
      location.firms?.name?.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Force a page refresh to get latest data from server
    window.location.reload();
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setEditForm({
      name: location.name,
      address: location.address,
      description: location.description || "",
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  const handleCancelEdit = () => {
    setEditingLocation(null);
    setEditForm({
      name: "",
      address: "",
      description: "",
      latitude: 0,
      longitude: 0,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingLocation) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("id", editingLocation.id);
    formData.append("name", editForm.name);
    formData.append("address", editForm.address);
    formData.append("description", editForm.description);
    formData.append("latitude", editForm.latitude.toString());
    formData.append("longitude", editForm.longitude.toString());

    try {
      await updateLocation(formData);
      handleCancelEdit();
      handleRefresh();
    } catch (error) {
      console.error("Failed to update location:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (location: Location) => {
    setDeletingLocation(location);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLocation) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("id", deletingLocation.id);

    try {
      await deleteLocation(formData);
      setDeletingLocation(null);
      handleRefresh();
    } catch (error) {
      console.error("Failed to delete location:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingLocation(null);
  };

  // Show loading skeleton while user is being loaded
  if (!user) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        {/* Header with count and actions */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {searchQuery ? (
              <>
                {/* Showing {filteredLocations.length} of {locations.length} location{locations.length !== 1 ? 's' : ''}
                {filteredLocations.length !== locations.length && (
                  <span className="text-blue-600 ml-1">(filtered)</span>
                )} */}
              </>
            ) : (
              <>
                {locations.length} location{locations.length !== 1 ? 's' : ''} found
              </>
            )}
          </div>
          <div className="flex gap-2">
            {/* <Button
              onClick={handleRefresh}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button> */}
            {user.role === "firm_admin" && (
              <AddLocationButton 
                onLocationAdded={() => handleRefresh()} 
                createLocation={createLocation}
              />
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search locations by name, address, description, or firm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {filteredLocations.length > 0 ? (
        // Super Admin view - Table layout
        user.role === "super_admin" ? (
          <div className="grid gap-6">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-sm">
                      <th className="px-4 py-2 text-left font-semibold">Name</th>
                      <th className="px-4 py-2 text-left font-semibold">Address</th>
                      <th className="px-4 py-2 text-left font-semibold">Description</th>
                      <th className="px-4 py-2 text-left font-semibold">Firm</th>
                      <th className="px-4 py-2 text-left font-semibold">Active</th>
                      {/* <th className="px-4 py-2 text-center font-semibold">Actions</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocations.map((location, idx) => (
                      <tr
                        key={location.id || idx}
                        className="bg-white border-b hover:bg-gray-50 text-gray-700"
                      >
                        <td className="px-4 py-2">{location.name}</td>
                        <td className="px-4 py-2">{location.address}</td>
                        <td className="px-4 py-2">{location.description || "—"}</td>
                        <td className="px-4 py-2">{location.firms?.name || "—"}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            location.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {location.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
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
                  Showing {locations.length} of {locations.length} locations
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Page 1 of 1</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Firm Admin view - Card layout
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onActionComplete={() => handleRefresh()}
                deleteLocation={deleteLocation}
              />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-lg">
          {locations.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold">No locations found.</h2>
              <p className="text-slate-500 mt-2">
                Get started by adding your first location.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">No locations match your search.</h2>
              <p className="text-slate-500 mt-2">
                Try adjusting your search terms or{" "}
                <button
                  onClick={() => setSearchQuery("")}
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
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-blue">Edit Location</h2>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Location Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter location name"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter location address"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter location description"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-latitude">Latitude</Label>
                  <Input
                    id="edit-latitude"
                    type="number"
                    step="any"
                    value={editForm.latitude}
                    onChange={(e) => setEditForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.0"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-longitude">Longitude</Label>
                  <Input
                    id="edit-longitude"
                    type="number"
                    step="any"
                    value={editForm.longitude}
                    onChange={(e) => setEditForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.0"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
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
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Location</h2>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete "{deletingLocation.name}"?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. The location will be marked as inactive.
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
                    Delete Location
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