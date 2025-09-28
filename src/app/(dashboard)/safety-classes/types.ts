export type SafetyClass = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  video_url: string;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  firm_id: string | null;
  thumbnail_url?: string;
  isRemote?: boolean; // New field to indicate if the class is remote
};

export type SafetyClassFormData = {
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  isRequired: boolean;
  thumbnailUrl?: string;
};
