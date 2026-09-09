export type WorkshopModule = { title: string; minutes: number; points: string[] };

export type WorkshopRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  format: "onsite" | "virtual" | "hybrid";
  durationMinutes: number;
  audience: string | null;
  outcomes: string[];
  modules: WorkshopModule[];
  minParticipants: number | null;
  maxParticipants: number | null;
  coverUrl: string | null;
  /**
   * The raw storage path from the column. The editor must round-trip this, not
   * coverUrl: saving the absolute URL back would pin the row to whichever
   * Supabase project rendered it, so every cover would break on a dev-to-prod
   * migration.
   */
  coverPath: string | null;
  isFeatured: boolean;
  displayOrder: number;
  status: "draft" | "scheduled" | "published" | "archived";
  publishedAt: string | null;
};
