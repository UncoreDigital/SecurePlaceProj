export type PhotoRow = {
  id: string;
  albumId: string;
  storagePath: string;
  publicUrl: string;
  alt: string;
  caption: string | null;
  displayOrder: number;
};

export type AlbumRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string | null;
  takenOn: string | null;
  category: string;
  status: "draft" | "scheduled" | "published" | "archived";
  publishedAt: string | null;
  isFeatured: boolean;
  displayOrder: number;
  photoCount: number;
  coverPhotoId: string | null;
  photos: PhotoRow[];
};

/**
 * What every gallery server action returns.
 *
 * These actions used to return void and only console.error their failures, so
 * an insert rejected by RLS or a CHECK constraint was indistinguishable from a
 * success: the form closed, the list stayed empty, and the reason was visible
 * only in the server terminal. The editor needs to be told.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };
