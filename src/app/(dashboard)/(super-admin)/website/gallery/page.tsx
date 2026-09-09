import { Suspense } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { describeError, marketingReadiness } from "../_lib/marketing";
import SetupNotice from "../_lib/SetupNotice";
import { saveAlbum, deleteAlbum, addPhoto, updatePhoto, deletePhoto, setCoverPhoto } from "./actions";
import type { PhotoRow, AlbumRow } from "./types";
import GalleryManager from "./GalleryManager.client";

/**
 * Website → Gallery.
 *
 * Super-admin only. Manages marketing.gallery_albums and gallery_photos, which
 * back the public site's /gallery pages. Photos live in the marketing-media
 * storage bucket; only the object path is stored on the row, so the bucket can
 * be re-pointed without a data migration.
 *
 * Follows the same shape as the other super-admin screens in this project: a
 * server component that fetches and exports server actions, plus a client
 * component for the interactive table.
 */

const REVALIDATE_PATH = "/website/gallery";
const BUCKET = "marketing-media";

function publicUrlFor(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

// The embed below is pinned to gallery_photos.album_id. gallery_albums also
// points back at gallery_photos via cover_photo_id, so an unqualified
// gallery_photos(...) embed is ambiguous and PostgREST rejects it (PGRST201).
async function getAlbums(): Promise<AlbumRow[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .schema("marketing")
    .from("gallery_albums")
    .select(
      `id, slug, title, description, location, taken_on, category, status,
       published_at, is_featured, display_order, photo_count, cover_photo_id,
       gallery_photos!gallery_photos_album_id_fkey ( id, album_id, storage_path, alt, caption, display_order )`,
    )
    .order("display_order")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch gallery albums:", describeError(error));
    return [];
  }

  return (data ?? []).map((a: any) => ({
    id: a.id,
    slug: a.slug ?? "",
    title: a.title ?? "",
    description: a.description ?? "",
    location: a.location,
    takenOn: a.taken_on,
    category: a.category ?? "Training",
    status: a.status,
    publishedAt: a.published_at,
    isFeatured: !!a.is_featured,
    displayOrder: a.display_order ?? 0,
    photoCount: a.photo_count ?? 0,
    coverPhotoId: a.cover_photo_id,
    photos: (a.gallery_photos ?? [])
      .map((p: any) => ({
        id: p.id,
        albumId: p.album_id,
        storagePath: p.storage_path,
        publicUrl: publicUrlFor(p.storage_path),
        alt: p.alt ?? "",
        caption: p.caption,
        displayOrder: p.display_order ?? 0,
      }))
      .sort((x: PhotoRow, y: PhotoRow) => x.displayOrder - y.displayOrder),
  }));
}

/* -------------------------- SERVER ACTIONS -------------------------- */

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Records an already-uploaded object against an album. */

/* -------------------------------- PAGE -------------------------------- */

function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-gray-600 text-lg">Loading gallery…</p>
    </div>
  );
}

async function GalleryContent() {
  // Probe once rather than rendering an empty album list that looks like
  // "nothing uploaded yet" when the schema is simply unreachable.
  const readiness = await marketingReadiness();
  if (!readiness.ok) return <SetupNotice readiness={readiness} />;

  const albums = await getAlbums();

  // Breadcrumb, page heading and the SuperAdminGuard all live in the section
  // layout now, so this renders only what is specific to the gallery.
  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Photo gallery</h2>
        <p className="mt-1 text-sm text-gray-500">
          Albums shown on the public website at /gallery. Only published albums
          are visible to visitors.
        </p>
      </div>
      <GalleryManager
        albums={albums}
        bucket={BUCKET}
        saveAlbum={saveAlbum}
        deleteAlbum={deleteAlbum}
        addPhoto={addPhoto}
        updatePhoto={updatePhoto}
        deletePhoto={deletePhoto}
        setCoverPhoto={setCoverPhoto}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <GalleryContent />
    </Suspense>
  );
}
