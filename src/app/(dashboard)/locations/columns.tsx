"use client";

// This defines the shape of our location data for Supabase
export interface Location {
  id: string;
  firm_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  firms?: {
    id: string;
    name: string;
  };
}

// We are keeping this file for the type definition, but the columns are no longer needed for the card layout.
export const columns = [];
