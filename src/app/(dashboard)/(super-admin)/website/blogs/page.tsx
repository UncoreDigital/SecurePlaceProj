import { Suspense } from "react";
import {
  marketing,
  MEDIA_BUCKET,
  publicUrl,
  describeError,
  marketingReadiness,
} from "../_lib/marketing";
import SetupNotice from "../_lib/SetupNotice";
import { savePost, deletePost, togglePostStatus } from "./actions";
import type { PostRow } from "./types";
import BlogManager from "./BlogManager.client";

/**
 * Website → Blog.
 *
 * Authors marketing.posts, which the public site renders at
 * /resources/blog/[slug]. Body is TipTap HTML; images inside it upload to the
 * marketing-media bucket via the shared RichTextEditor.
 *
 * Server actions live in ./actions and row types in ./types — a page module may
 * only export the set Next.js recognises, and exporting actions from here fails
 * the generated route type check.
 */

async function getPosts(): Promise<PostRow[]> {
  const db = await marketing();
  const { data, error } = await db
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch posts:", describeError(error));
    return [];
  }

  return (data ?? []).map((p: any) => ({
    id: p.id,
    slug: p.slug ?? "",
    title: p.title ?? "",
    excerpt: p.excerpt ?? "",
    body: p.body ?? "",
    coverUrl: publicUrl(MEDIA_BUCKET, p.cover_url),
    coverPath: p.cover_url ?? null,
    authorName: p.author_name ?? "Secure Place to Work",
    authorRole: p.author_role,
    category: p.category ?? "General",
    tags: p.tags ?? [],
    readingMinutes: p.reading_minutes ?? 3,
    isFeatured: !!p.is_featured,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    status: p.status,
    publishedAt: p.published_at,
    updatedAt: p.updated_at,
  }));
}

async function Content() {
  // One probe for the whole section: if the schema is unreachable every screen
  // fails identically, so say so once instead of rendering an empty table that
  // reads as "no content yet".
  const readiness = await marketingReadiness();
  if (!readiness.ok) return <SetupNotice readiness={readiness} />;

  const posts = await getPosts();
  return (
    <>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Blog</h2>
        <p className="mt-1 text-sm text-gray-500">
          Articles published at /resources/blog. Reading time is calculated from
          the body — you do not need to set it.
        </p>
      </div>
      <BlogManager
        posts={posts}
        savePost={savePost}
        deletePost={deletePost}
        togglePostStatus={togglePostStatus}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-lg text-gray-600">Loading articles…</p>
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
