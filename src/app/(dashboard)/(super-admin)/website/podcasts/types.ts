export type EpisodeRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  showNotes: string;
  transcript: string | null;
  season: number;
  episodeNumber: number | null;
  audioPath: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  coverUrl: string | null;
  /**
   * The raw storage path from the column. The editor must round-trip this, not
   * coverUrl: saving the absolute URL back would pin the row to whichever
   * Supabase project rendered it, so every cover would break on a dev-to-prod
   * migration.
   */
  coverPath: string | null;
  guests: string[];
  spotifyUrl: string | null;
  appleUrl: string | null;
  youtubeUrl: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  publishedAt: string | null;
};
