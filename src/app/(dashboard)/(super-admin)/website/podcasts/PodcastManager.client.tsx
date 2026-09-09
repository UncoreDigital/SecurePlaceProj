"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { EpisodeRow } from "./types";
import ImageUploader from "../_lib/ImageUploader.client";
import {
  ensureFreshSession,
  withTimeout,
  messageFor,
  UPLOAD_TIMEOUT_MS,
} from "@/lib/upload";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { ActionResult } from "../_lib/marketing";

type Action = (fd: FormData) => Promise<ActionResult>;

type Props = {
  episodes: EpisodeRow[];
  saveEpisode: Action;
  deleteEpisode: Action;
};

const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
const label = "block text-xs font-semibold text-gray-600 mb-1";

function duration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr ${m % 60} min`;
}

export default function PodcastManager({ episodes, saveEpisode, deleteEpisode }: Props) {
  const [editing, setEditing] = useState<EpisodeRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<EpisodeRow | null>(null);

  if (creating || editing) {
    return (
      <EpisodeEditor
        episode={editing}
        saveEpisode={saveEpisode}
        onDone={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          New episode
        </button>
      </div>

      {episodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold text-gray-700">No episodes yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Until one is published, the website shows a &ldquo;podcast is on the
            way&rdquo; page rather than an empty list.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Episode</th>
                <th className="px-4 py-3">Length</th>
                <th className="px-4 py-3">Audio</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((e) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{e.title}</div>
                    <div className="mt-0.5 font-mono text-xs text-gray-400">
                      S{e.season}
                      {e.episodeNumber ? ` · E${e.episodeNumber}` : ""} · /{e.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{duration(e.durationSeconds)}</td>
                  <td className="px-4 py-3">
                    {e.audioUrl ? (
                      <span className="text-xs font-semibold text-green-700">Uploaded</span>
                    ) : e.spotifyUrl || e.appleUrl || e.youtubeUrl ? (
                      <span className="text-xs text-gray-600">Platform link</span>
                    ) : (
                      <span className="text-xs text-red-600">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        e.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(e)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(e)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="Delete this episode?"
        description={
          <>
            <span className="font-medium text-gray-900">{pendingDelete?.title}</span>{" "}
            will be removed permanently. This cannot be undone.
          </>
        }
        confirmLabel="Delete episode"
        onConfirm={async () => {
          if (!pendingDelete) return;
          const fd = new FormData();
          fd.set("id", pendingDelete.id);
          const result = await deleteEpisode(fd);
          // Returning the message keeps the dialog open with the reason on it.
          if (!result.ok) return result.error;
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

/* -------------------------------- editor -------------------------------- */

function EpisodeEditor({
  episode,
  saveEpisode,
  onDone,
}: {
  episode: EpisodeRow | null;
  saveEpisode: Action;
  onDone: () => void;
}) {
  const [saveError, setSaveError] = useState("");
  const [showNotes, setShowNotes] = useState(episode?.showNotes ?? "");
  const [audioPath, setAudioPath] = useState(episode?.audioPath ?? "");
  const [coverPath, setCoverPath] = useState(episode?.coverPath ?? "");
  const [durationSeconds, setDurationSeconds] = useState(episode?.durationSeconds ?? 0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [uploadError, setUploadError] = useState("");

  async function uploadAudio(file: File) {
    setUploading(true);
    setUploadError("");
    setProgress("Checking your session…");

    const supabase = createBrowserSupabase();

    // An expired session makes the upload block forever instead of failing.
    const sessionProblem = await ensureFreshSession(supabase);
    if (sessionProblem) {
      setProgress("");
      setUploadError(sessionProblem);
      setUploading(false);
      return;
    }

    setProgress("Uploading audio…");

    // Read the true length from the file rather than asking the author to type
    // it — a wrong duration on a player is immediately obvious to a listener.
    const seconds = await readDuration(file).catch(() => 0);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
    const path = `episodes/${crypto.randomUUID()}.${ext}`;

    let uploadError: { message: string } | null = null;
    try {
      const result = await withTimeout(
        supabase.storage
          .from("marketing-audio")
          .upload(path, file, { cacheControl: "31536000" }),
        UPLOAD_TIMEOUT_MS,
        "The audio upload timed out. Check your connection, then try again.",
      );
      uploadError = result.error;
    } catch (cause) {
      uploadError = { message: messageFor(cause, "The audio upload failed.") };
    }

    if (uploadError) {
      setProgress("");
      setUploadError(uploadError.message);
    } else {
      setAudioPath(path);
      if (seconds) setDurationSeconds(Math.round(seconds));
      setProgress("Uploaded");
    }
    setUploading(false);
  }

  return (
    <form
      action={async (fd) => {
        const result = await saveEpisode(fd);
        if (!result.ok) {
          setSaveError(result.error);
          return;
        }
        setSaveError("");
        onDone();
      }}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      {saveError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span className="font-semibold">Could not save this episode. </span>
          {saveError}
        </div>
      )}

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {episode ? "Edit episode" : "New episode"}
        </h2>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
        >
          Back to list
        </button>
      </div>

      {episode && <input type="hidden" name="id" value={episode.id} />}
      {episode?.publishedAt && (
        <input type="hidden" name="publishedAt" value={episode.publishedAt} />
      )}
      <input type="hidden" name="showNotes" value={showNotes} />
      <input type="hidden" name="audioPath" value={audioPath} />
      <input type="hidden" name="coverUrl" value={coverPath} />
      <input type="hidden" name="durationSeconds" value={durationSeconds} />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className={label}>Title</label>
          <input name="title" required defaultValue={episode?.title} className={input} />
        </div>
        <div>
          <label className={label}>Season</label>
          <input
            type="number"
            name="season"
            min={1}
            defaultValue={episode?.season ?? 1}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Episode number</label>
          <input
            type="number"
            name="episodeNumber"
            min={1}
            defaultValue={episode?.episodeNumber ?? ""}
            className={input}
          />
        </div>

        <div className="lg:col-span-4">
          <label className={label}>Slug</label>
          <input
            name="slug"
            defaultValue={episode?.slug}
            placeholder="From title if blank"
            className={input}
          />
        </div>

        <div className="lg:col-span-4">
          <label className={label}>Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={episode?.description}
            className={input}
          />
        </div>

        <div className="lg:col-span-4">
          <label className={label}>Show notes</label>
          <RichTextEditor
            content={showNotes}
            onChange={setShowNotes}
            placeholder="Links, timestamps, references…"
            imageBucket="marketing-media"
          />
        </div>

        <div className="lg:col-span-2">
          <label className={label}>Audio file</label>
          <input
            type="file"
            accept="audio/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])}
            className="block w-full text-xs"
          />
          {progress && <p className="mt-1 text-xs text-gray-600">{progress}</p>}
          {uploadError && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {uploadError}
            </p>
          )}
          {audioPath && (
            <p className="mt-1 truncate font-mono text-xs text-green-700">
              {audioPath} · {Math.round(durationSeconds / 60)} min
            </p>
          )}
        </div>

        <div className="lg:col-span-2">
          <ImageUploader
            bucket="marketing-media"
            folder="podcast"
            value={coverPath}
            previewUrl={episode?.coverUrl}
            onChange={setCoverPath}
            label="Episode artwork"
            hint="Square artwork works best — it is what podcast apps display."
          />
        </div>

        <div className="lg:col-span-2">
          <label className={label}>
            Guests <span className="font-normal text-gray-400">comma separated</span>
          </label>
          <input name="guests" defaultValue={episode?.guests.join(", ")} className={input} />
        </div>

        <div>
          <label className={label}>Spotify URL</label>
          <input name="spotifyUrl" defaultValue={episode?.spotifyUrl ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Apple Podcasts URL</label>
          <input name="appleUrl" defaultValue={episode?.appleUrl ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>YouTube URL</label>
          <input name="youtubeUrl" defaultValue={episode?.youtubeUrl ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={episode?.status ?? "draft"} className={input}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="lg:col-span-4">
          <label className={label}>
            Transcript <span className="font-normal text-gray-400">optional, shown collapsed and indexed by search</span>
          </label>
          <textarea
            name="transcript"
            rows={5}
            defaultValue={episode?.transcript ?? ""}
            className={input}
          />
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
        An episode needs uploaded audio or at least one platform link before it
        can be published. Without one it will be saved as a draft.
      </p>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {episode ? "Save changes" : "Create episode"}
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

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not read audio"));
    };
    audio.src = url;
  });
}
