"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LoaderCircle, Upload } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { validateImage, formatBytes } from "../_lib/ImageUploader.client";
import {
  ensureFreshSession,
  withTimeout,
  messageFor,
  UPLOAD_TIMEOUT_MS,
} from "@/lib/upload";
import type { AlbumRow, PhotoRow, ActionResult } from "./types";

type Action = (fd: FormData) => Promise<ActionResult>;

type Props = {
  albums: AlbumRow[];
  bucket: string;
  saveAlbum: Action;
  deleteAlbum: Action;
  addPhoto: Action;
  updatePhoto: Action;
  deletePhoto: Action;
  setCoverPhoto: Action;
};

/**
 * Every form on this screen reports failures to one banner at the top.
 *
 * A <form action={...}> cannot surface a returned value on its own, and these
 * panels nest three deep, so a context is cheaper than threading a setter
 * through AlbumCard, PhotoPanel and PhotoCard.
 */
const ReportError = createContext<(message: string) => void>(() => {});

// Adapts a result-returning action into the void shape <form action> wants,
// routing failures to the banner instead of dropping them on the floor.
function useBound(action: Action) {
  const report = useContext(ReportError);
  return async (fd: FormData) => {
    const result = await action(fd);
    report(result.ok ? "" : result.error);
  };
}

const CATEGORIES = [
  "Training",
  "Evacuation drill",
  "Fire safety",
  "First aid",
  "POSH session",
  "Certification",
  "Other",
];

/** One row of the multi-file upload queue. */
type UploadItem = {
  id: string;
  name: string;
  size: number;
  preview: string;
  status: "pending" | "uploading" | "done" | "failed";
  error: string;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
const label = "block text-xs font-semibold text-gray-600 mb-1";

export default function GalleryManager({
  albums,
  bucket,
  saveAlbum,
  deleteAlbum,
  addPhoto,
  updatePhoto,
  deletePhoto,
  setCoverPhoto,
}: Props) {
  const [editing, setEditing] = useState<AlbumRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const showForm = creating || editing !== null;

  return (
    <ReportError.Provider value={setActionError}>
    <div className="flex flex-col gap-6">
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span className="font-semibold">That did not save. </span>
          {actionError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          New album
        </button>
      </div>

      {showForm && (
        <AlbumForm
          album={editing}
          onDone={() => {
            setEditing(null);
            setCreating(false);
          }}
          saveAlbum={saveAlbum}
        />
      )}

      {albums.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold text-gray-700">No albums yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Create an album, upload the photographs, then set its status to
            Published to make it visible on the website.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              bucket={bucket}
              expanded={openAlbum === album.id}
              onToggle={() => setOpenAlbum(openAlbum === album.id ? null : album.id)}
              onEdit={() => {
                setCreating(false);
                setEditing(album);
              }}
              deleteAlbum={deleteAlbum}
              addPhoto={addPhoto}
              updatePhoto={updatePhoto}
              deletePhoto={deletePhoto}
              setCoverPhoto={setCoverPhoto}
            />
          ))}
        </div>
      )}
    </div>
    </ReportError.Provider>
  );
}

/* ------------------------------- album form ------------------------------- */

function AlbumForm({
  album,
  onDone,
  saveAlbum,
}: {
  album: AlbumRow | null;
  onDone: () => void;
  saveAlbum: Action;
}) {
  const [error, setError] = useState("");

  // Set after mount, never during render: the server and the browser can sit on
  // different sides of midnight, and a differing max= would be a hydration
  // mismatch. UTC is deliberate — it is what the albums_taken_on_not_future
  // CHECK compares against, so the picker and the database agree.
  const [maxDate, setMaxDate] = useState("");
  useEffect(() => setMaxDate(new Date().toISOString().slice(0, 10)), []);

  return (
    <form
      action={async (fd) => {
        const result = await saveAlbum(fd);
        // Closing on failure was the original bug: the form vanished, the list
        // stayed empty, and nothing said why. Dismiss only on success, keeping
        // the typed values on screen so they need not be retyped.
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setError("");
        onDone();
      }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        {album ? "Edit album" : "New album"}
      </h2>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span className="font-semibold">Could not save this album. </span>
          {error}
        </div>
      )}

      {album && <input type="hidden" name="id" value={album.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={label}>Title</label>
          <input name="title" required defaultValue={album?.title} className={input} />
        </div>

        <div>
          <label className={label}>Slug</label>
          <input
            name="slug"
            defaultValue={album?.slug}
            placeholder="Generated from the title if left blank"
            className={input}
          />
        </div>

        <div>
          <label className={label}>Category</label>
          <select name="category" defaultValue={album?.category ?? "Training"} className={input}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className={label}>Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={album?.description}
            className={input}
          />
        </div>

        <div>
          <label className={label}>
            Location <span className="font-normal text-gray-400">optional</span>
          </label>
          <input
            name="location"
            defaultValue={album?.location ?? ""}
            placeholder="e.g. Client site, Pune"
            className={input}
          />
        </div>

        <div>
          <label className={label}>
            Date taken <span className="font-normal text-gray-400">optional</span>
          </label>
          <input
            type="date"
            name="takenOn"
            max={maxDate || undefined}
            defaultValue={album?.takenOn ?? ""}
            className={input}
          />
          {/* Both fields are optional on purpose: leave them blank rather than
              guessing. An album with no date is fine; a wrong one is not. */}
          <p className="mt-1 text-xs text-gray-400">
            Leave blank if unknown. Cannot be in the future.
          </p>
        </div>

        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={album?.status ?? "draft"} className={input}>
            <option value="draft">Draft — not on the website</option>
            <option value="published">Published — live</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className={label}>Display order</label>
          <input
            type="number"
            name="displayOrder"
            defaultValue={album?.displayOrder ?? 0}
            className={input}
          />
        </div>

        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={album?.isFeatured}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-700">Feature on the resources page</span>
        </label>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {album ? "Save changes" : "Create album"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------- album card ------------------------------- */

function AlbumCard({
  album,
  bucket,
  expanded,
  onToggle,
  onEdit,
  deleteAlbum,
  addPhoto,
  updatePhoto,
  deletePhoto,
  setCoverPhoto,
}: {
  album: AlbumRow;
  bucket: string;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
} & Pick<Props, "deleteAlbum" | "addPhoto" | "updatePhoto" | "deletePhoto" | "setCoverPhoto">) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">{album.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                album.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {album.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {album.photoCount} photo{album.photoCount === 1 ? "" : "s"}
            {album.location ? ` · ${album.location}` : ""}
            {album.takenOn ? ` · ${album.takenOn}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
          >
            {expanded ? "Hide photos" : "Manage photos"}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>

          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Delete this album?"
            description={
              <>
                <span className="font-medium text-gray-900">{album.title}</span>{" "}
                and its {album.photoCount} photograph
                {album.photoCount === 1 ? "" : "s"} will be deleted, and the
                image files removed from storage. This cannot be undone.
              </>
            }
            confirmLabel="Delete album"
            onConfirm={async () => {
              const fd = new FormData();
              fd.set("id", album.id);
              const result = await deleteAlbum(fd);
              if (!result.ok) return result.error;
            }}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4">
          <PhotoUploader album={album} bucket={bucket} addPhoto={addPhoto} />

          {album.photos.length > 0 && (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {album.photos.map((photo) => (
                <PhotoEditor
                  key={photo.id}
                  photo={photo}
                  isCover={album.coverPhotoId === photo.id}
                  albumId={album.id}
                  updatePhoto={updatePhoto}
                  deletePhoto={deletePhoto}
                  setCoverPhoto={setCoverPhoto}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- uploader -------------------------------- */

function PhotoUploader({
  album,
  bucket,
  addPhoto,
}: {
  album: AlbumRow;
  bucket: string;
  addPhoto: Action;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  // One row per selected file. The previous version kept a single error string,
  // so uploading eight photographs and having two fail told you about one of
  // them and left you guessing which others landed.
  const [queue, setQueue] = useState<UploadItem[]>([]);

  const doneCount = queue.filter((q) => q.status === "done").length;
  const failedCount = queue.filter((q) => q.status === "failed").length;

  async function upload(files: FileList) {
    const chosen = Array.from(files);
    if (chosen.length === 0) return;

    // Seed the queue so every file is visible with its thumbnail before any
    // network work starts; the editor can see what is about to happen.
    const items: UploadItem[] = chosen.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
      status: "pending",
      error: "",
    }));
    setQueue(items);
    setBusy(true);

    const supabase = createBrowserSupabase();

    // Checked once for the whole batch: if the session has lapsed, every file
    // would otherwise stall in turn with no explanation.
    const sessionProblem = await ensureFreshSession(supabase);
    if (sessionProblem) {
      setQueue((q) => q.map((item) => ({ ...item, status: "failed", error: sessionProblem })));
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    let index = album.photos.length;

    for (let i = 0; i < chosen.length; i++) {
      const file = chosen[i];
      const id = items[i].id;
      const mark = (patch: Partial<UploadItem>) =>
        setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)));

      const invalid = validateImage(file);
      if (invalid) {
        mark({ status: "failed", error: invalid });
        continue;
      }

      mark({ status: "uploading" });

      // Real pixel dimensions let the public gallery reserve space and avoid
      // layout shift when the image loads.
      const dims = await readDimensions(file).catch(() => ({ width: 0, height: 0 }));

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `gallery/${album.slug}/${crypto.randomUUID()}.${ext}`;

      let uploadError: { message: string } | null = null;
      try {
        const result = await withTimeout(
          supabase.storage
            .from(bucket)
            .upload(path, file, { cacheControl: "31536000", upsert: false }),
          UPLOAD_TIMEOUT_MS,
          "Timed out. Check your connection, then try again.",
        );
        uploadError = result.error;
      } catch (cause) {
        uploadError = { message: messageFor(cause, "The upload failed.") };
      }

      if (uploadError) {
        mark({ status: "failed", error: uploadError.message });
        continue;
      }

      const fd = new FormData();
      fd.set("albumId", album.id);
      fd.set("storagePath", path);
      // Alt text starts from the filename so the row can be created, but it is
      // meant to be replaced — the caption editor below prompts for it.
      fd.set("alt", file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
      fd.set("width", String(dims.width));
      fd.set("height", String(dims.height));
      fd.set("displayOrder", String(index));

      const added = await addPhoto(fd);
      if (!added.ok) {
        // The object is in the bucket but its row was refused. Remove the file
        // rather than leave something nothing points at.
        await supabase.storage.from(bucket).remove([path]);
        mark({ status: "failed", error: added.error });
        continue;
      }

      index++;
      mark({ status: "done" });
    }

    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearQueue() {
    queue.forEach((item) => URL.revokeObjectURL(item.preview));
    setQueue([]);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!busy && e.dataTransfer.files?.length) upload(e.dataTransfer.files);
      }}
      className={`rounded-lg border border-dashed p-4 transition-colors ${
        dragging ? "border-brand-orange bg-orange-50" : "border-gray-300"
      }`}
    >
      <label className="block text-sm font-semibold text-gray-700">
        Add photographs
      </label>
      <p className="mt-1 text-xs text-gray-500">
        Drag several here, or choose files. JPEG, PNG, WebP or AVIF, up to 10 MB
        each. Give every photo real alt text afterwards — it is what a screen
        reader announces.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          Choose files
        </button>

        {busy && (
          <span className="inline-flex items-center gap-2 text-xs text-gray-600">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Uploading {doneCount + failedCount + 1} of {queue.length}…
          </span>
        )}

        {!busy && queue.length > 0 && (
          <>
            <span className="text-xs text-gray-600">
              {doneCount} added
              {failedCount > 0 && `, ${failedCount} failed`}
            </span>
            <button
              type="button"
              onClick={clearQueue}
              className="text-xs font-semibold text-gray-500 underline hover:text-gray-700"
            >
              Clear list
            </button>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPTED.join(",")}
        disabled={busy}
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
        className="sr-only"
      />

      {queue.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
            >
              <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, nothing for the optimiser to do */}
                <img
                  src={item.preview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-gray-800">
                  {item.name}
                </span>
                <span className="block text-2xs text-gray-500">
                  {formatBytes(item.size)}
                  {item.error && (
                    <span className="text-red-600"> · {item.error}</span>
                  )}
                </span>
              </span>

              <span className="shrink-0 text-xs font-semibold">
                {item.status === "pending" && <span className="text-gray-400">Waiting</span>}
                {item.status === "uploading" && (
                  <LoaderCircle className="h-4 w-4 animate-spin text-gray-500" />
                )}
                {item.status === "done" && <span className="text-green-700">Added</span>}
                {item.status === "failed" && <span className="text-red-600">Failed</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not read image"));
    };
    img.src = url;
  });
}

/* ------------------------------ photo editor ------------------------------ */

function PhotoEditor({
  photo,
  isCover,
  albumId,
  updatePhoto,
  deletePhoto,
  setCoverPhoto,
}: {
  photo: PhotoRow;
  isCover: boolean;
  albumId: string;
} & Pick<Props, "updatePhoto" | "deletePhoto" | "setCoverPhoto">) {
  const boundUpdatePhoto = useBound(updatePhoto);
  const boundSetCover = useBound(setCoverPhoto);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded bg-gray-100">
        <Image
          src={photo.publicUrl}
          alt={photo.alt}
          fill
          sizes="(max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          unoptimized
        />
        {isCover && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-blue px-2 py-0.5 text-xs font-semibold text-white">
            Cover
          </span>
        )}
      </div>

      <form action={boundUpdatePhoto} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="id" value={photo.id} />
        <div>
          <label className={label}>Alt text (required)</label>
          <input name="alt" required defaultValue={photo.alt} className={input} />
        </div>
        <div>
          <label className={label}>Caption</label>
          <input name="caption" defaultValue={photo.caption ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Order</label>
          <input
            type="number"
            name="displayOrder"
            defaultValue={photo.displayOrder}
            className={input}
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Save
        </button>
      </form>

      <div className="mt-2 flex gap-2">
        {!isCover && (
          <form action={boundSetCover} className="flex-1">
            <input type="hidden" name="albumId" value={albumId} />
            <input type="hidden" name="photoId" value={photo.id} />
            <button
              type="submit"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
            >
              Make cover
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          Delete
        </button>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this photograph?"
          description="The image file is removed from storage as well. This cannot be undone."
          confirmLabel="Delete photo"
          onConfirm={async () => {
            const fd = new FormData();
            fd.set("id", photo.id);
            fd.set("storagePath", photo.storagePath);
            const result = await deletePhoto(fd);
            if (!result.ok) return result.error;
          }}
        />
      </div>
    </li>
  );
}
