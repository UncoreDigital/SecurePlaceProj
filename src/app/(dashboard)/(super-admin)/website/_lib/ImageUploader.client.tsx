"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import {
  ensureFreshSession,
  withTimeout,
  messageFor,
  UPLOAD_TIMEOUT_MS,
} from "@/lib/upload";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // matches the bucket's file_size_limit
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/** Human-readable size, so "10485760" never reaches an editor. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Rejects a file before it is uploaded.
 *
 * The bucket enforces both limits server-side, but letting the request go and
 * surfacing a raw storage error wastes the editor's upload and tells them very
 * little. Returns null when the file is acceptable.
 */
export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `${file.name} is a ${file.type || "unknown type"}. Use JPEG, PNG, WebP or AVIF.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`;
  }
  return null;
}

/**
 * Cover-image field: pick or drop a file, see it, replace it, remove it.
 *
 * It replaces a bare <input type="file"> that printed the raw storage path in
 * green monospace — which gave no way to tell whether the right image had been
 * chosen, no way to clear a mistake, and reported failures through alert().
 *
 * `value` and `onChange` carry the storage *path*, not a URL: that is what the
 * database column stores, and it keeps the row valid if the project's public
 * URL ever changes.
 */
export default function ImageUploader({
  bucket,
  folder,
  value,
  previewUrl,
  onChange,
  label = "Cover image",
  hint,
}: {
  bucket: string;
  folder: string;
  value: string;
  /** Public URL for an already-saved cover, when the path alone is not renderable. */
  previewUrl?: string | null;
  onChange: (path: string) => void;
  label?: string;
  hint?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  // Local object URL for a file chosen this session, so the preview appears
  // immediately instead of waiting on a round trip to the CDN.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const shown = localPreview ?? (value ? previewUrl ?? null : null);

  async function upload(file: File) {
    const invalid = validateImage(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError("");
    setBusy(true);

    const supabase = createBrowserSupabase();

    // An expired session makes the upload below block forever rather than fail,
    // so it is settled first.
    const sessionProblem = await ensureFreshSession(supabase);
    if (sessionProblem) {
      setError(sessionProblem);
      setBusy(false);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    let uploadError: { message: string } | null = null;
    try {
      const result = await withTimeout(
        supabase.storage
          .from(bucket)
          .upload(path, file, { cacheControl: "31536000", upsert: false }),
        UPLOAD_TIMEOUT_MS,
        "The upload timed out. Check your connection, then try again.",
      );
      uploadError = result.error;
    } catch (cause) {
      uploadError = { message: messageFor(cause, "The upload failed.") };
    }

    if (uploadError) {
      URL.revokeObjectURL(objectUrl);
      setError(uploadError.message);
      setBusy(false);
      return;
    }

    // The previous cover is now unreferenced. Removing it here keeps the bucket
    // from filling with images nothing points at; a failure is not worth
    // interrupting the editor over, so it is logged rather than surfaced.
    const previous = value;
    if (previous && previous !== path) {
      supabase.storage
        .from(bucket)
        .remove([previous])
        .then(({ error: removeError }) => {
          if (removeError) {
            console.warn("Could not remove replaced cover:", removeError.message);
          }
        });
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(objectUrl);
    onChange(path);
    setBusy(false);
  }

  function clear() {
    // Only drops the reference. The object stays until the row is saved, so a
    // mistaken "remove" followed by Cancel does not destroy a live cover.
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setError("");
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={`relative flex items-center gap-4 rounded-lg border border-dashed p-3 transition-colors ${
          dragging ? "border-brand-orange bg-orange-50" : "border-gray-300 bg-white"
        }`}
      >
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-gray-100">
          {shown ? (
            <Image
              src={shown}
              alt=""
              fill
              sizes="112px"
              // A blob: URL is not a configured next/image host, and the
              // optimiser cannot fetch it anyway.
              unoptimized={shown.startsWith("blob:")}
              className="object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-gray-300">
              <ImagePlus className="h-6 w-6" />
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-white/70">
              <LoaderCircle className="h-5 w-5 animate-spin text-gray-500" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">
            {hint ??
              "Drag an image here, or choose a file. JPEG, PNG, WebP or AVIF, up to 10 MB."}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {value ? "Replace" : "Choose file"}
            </button>

            {value && !busy && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
          className="sr-only"
        />
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
