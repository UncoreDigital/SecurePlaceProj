import { Suspense } from "react";
import {
  marketing,
  AUDIO_BUCKET,
  MEDIA_BUCKET,
  publicUrl,
  describeError,
  marketingReadiness,
} from "../_lib/marketing";
import SetupNotice from "../_lib/SetupNotice";
import { saveEpisode, deleteEpisode } from "./actions";
import type { EpisodeRow } from "./types";
import PodcastManager from "./PodcastManager.client";

/**
 * Website → Podcast.
 *
 * Authors marketing.podcast_episodes. Audio uploads to the marketing-audio
 * bucket, which is public so <audio> and any future RSS feed can stream it
 * without a signed URL.
 *
 * A published episode must have something to play — enforced by a CHECK
 * constraint requiring audio or at least one platform link — so the editor
 * blocks publishing before the database has to.
 */

const REVALIDATE_PATH = "/website/podcasts";

async function getEpisodes(): Promise<EpisodeRow[]> {
  const db = await marketing();
  const { data, error } = await db
    .from("podcast_episodes")
    .select("*")
    .order("season", { ascending: false })
    .order("episode_number", { ascending: false, nullsFirst: false });

  if (error) {
    console.error(`Failed to fetch episodes:`, describeError(error));
    return [];
  }

  return (data ?? []).map((e: any) => ({
    id: e.id,
    slug: e.slug ?? "",
    title: e.title ?? "",
    description: e.description ?? "",
    showNotes: e.show_notes ?? "",
    transcript: e.transcript,
    season: e.season ?? 1,
    episodeNumber: e.episode_number,
    audioPath: e.audio_url,
    audioUrl: publicUrl(AUDIO_BUCKET, e.audio_url),
    durationSeconds: e.duration_seconds,
    coverUrl: publicUrl(MEDIA_BUCKET, e.cover_url),
    coverPath: e.cover_url ?? null,
    guests: e.guests ?? [],
    spotifyUrl: e.spotify_url,
    appleUrl: e.apple_url,
    youtubeUrl: e.youtube_url,
    status: e.status,
    publishedAt: e.published_at,
  }));
}

/* -------------------------- SERVER ACTIONS -------------------------- */

/* -------------------------------- PAGE -------------------------------- */

async function Content() {
  // One probe for the whole section: if the schema is unreachable every
  // screen fails identically, so say so once instead of rendering an
  // empty table that looks like "no content yet".
  const readiness = await marketingReadiness();
  if (!readiness.ok) return <SetupNotice readiness={readiness} />;

  const episodes = await getEpisodes();
  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Podcast</h2>
        <p className="mt-1 text-sm text-gray-500">
          Episodes published at /resources/podcast. An episode needs audio or at
          least one platform link before it can go live.
        </p>
      </div>
      <PodcastManager
        episodes={episodes}
        saveEpisode={saveEpisode}
        deleteEpisode={deleteEpisode}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-lg text-gray-600">Loading episodes…</p>
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
