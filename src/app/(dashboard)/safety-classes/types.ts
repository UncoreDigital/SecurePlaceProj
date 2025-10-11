export type SafetyClass = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  video_url: string;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  firm_id: string | null;
  thumbnail_url?: string;
  type: "Safety Class" | "Drill";
  mode: "Remote" | "InPerson";
  isRemote?: boolean; // Computed field for backward compatibility
};

export type SafetyClassFormData = {
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  isRequired: boolean;
  thumbnailUrl?: string;
  type: "Safety Class" | "Drill";
  mode: "Remote" | "InPerson";
};
