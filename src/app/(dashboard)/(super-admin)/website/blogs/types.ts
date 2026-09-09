export type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string | null;
  /**
   * The raw storage path from the column. The editor must round-trip this, not
   * coverUrl: saving the absolute URL back would pin the row to whichever
   * Supabase project rendered it, so every cover would break on a dev-to-prod
   * migration.
   */
  coverPath: string | null;
  authorName: string;
  authorRole: string | null;
  category: string;
  tags: string[];
  readingMinutes: number;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "draft" | "scheduled" | "published" | "archived";
  publishedAt: string | null;
  updatedAt: string | null;
};
