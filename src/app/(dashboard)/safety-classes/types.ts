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
};

export type SafetyClassFormData = {
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  isRequired: boolean;
};
