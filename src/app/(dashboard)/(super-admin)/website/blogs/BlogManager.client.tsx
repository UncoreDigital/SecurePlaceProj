"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import type { PostRow } from "./types";
import ImageUploader from "../_lib/ImageUploader.client";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { ActionResult } from "../_lib/marketing";

type Action = (fd: FormData) => Promise<ActionResult>;

type Props = {
  posts: PostRow[];
  savePost: Action;
  deletePost: Action;
  togglePostStatus: Action;
};

const CATEGORIES = [
  "Drills & Readiness",
  "Speak-Up & Reporting",
  "Training & Awareness",
  "Compliance & Governance",
  "Certification",
  "General",
];

const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
const label = "block text-xs font-semibold text-gray-600 mb-1";

function badge(status: string) {
  return status === "published"
    ? "bg-green-100 text-green-700"
    : status === "archived"
      ? "bg-gray-200 text-gray-600"
      : "bg-amber-100 text-amber-700";
}

export default function BlogManager({
  posts,
  savePost,
  deletePost,
  togglePostStatus,
}: Props) {
  const [editing, setEditing] = useState<PostRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PostRow | null>(null);
  const [actionError, setActionError] = useState("");

  if (creating || editing) {
    return (
      <PostEditor
        post={editing}
        savePost={savePost}
        onDone={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {actionError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          New article
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold text-gray-700">No articles yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Write one, then set its status to Published to put it on the website.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{post.title}</div>
                    <div className="mt-0.5 font-mono text-xs text-gray-400">
                      /{post.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{post.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge(post.status)}`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {post.publishedAt ? post.publishedAt.slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <form
                action={async (fd) => {
                  const result = await togglePostStatus(fd);
                  setActionError(result.ok ? "" : result.error);
                }}
              >
                        <input type="hidden" name="id" value={post.id} />
                        <input
                          type="hidden"
                          name="next"
                          value={post.status === "published" ? "draft" : "published"}
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                        >
                          {post.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() => setEditing(post)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(post)}
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
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this article?"
        description={
          <>
            <span className="font-medium text-gray-900">{pendingDelete?.title}</span>{" "}
            will be removed from the website permanently. This cannot be undone.
          </>
        }
        confirmLabel="Delete article"
        onConfirm={async () => {
          if (!pendingDelete) return;
          const fd = new FormData();
          fd.set("id", pendingDelete.id);
          const result = await deletePost(fd);
          // Returning the message keeps the dialog open with the reason on it.
          if (!result.ok) return result.error;
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

/* -------------------------------- editor -------------------------------- */

function PostEditor({
  post,
  savePost,
  onDone,
}: {
  post: PostRow | null;
  savePost: Action;
  onDone: () => void;
}) {
  const [saveError, setSaveError] = useState("");
  // The editor is uncontrolled except for the body: TipTap owns its own state,
  // so the HTML is mirrored here and submitted through a hidden field.
  const [body, setBody] = useState(post?.body ?? "");
  const [coverPath, setCoverPath] = useState(post?.coverPath ?? "");

  return (
    <form
      action={async (fd) => {
        const result = await savePost(fd);
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
          <span className="font-semibold">Could not save this article. </span>
          {saveError}
        </div>
      )}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {post ? "Edit article" : "New article"}
        </h2>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
        >
          Back to list
        </button>
      </div>

      {post && <input type="hidden" name="id" value={post.id} />}
      {post?.publishedAt && (
        <input type="hidden" name="publishedAt" value={post.publishedAt} />
      )}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="coverUrl" value={coverPath} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className={label}>Title</label>
          <input name="title" required defaultValue={post?.title} className={input} />
        </div>

        <div>
          <label className={label}>Slug</label>
          <input
            name="slug"
            defaultValue={post?.slug}
            placeholder="From title if blank"
            className={input}
          />
        </div>

        <div className="lg:col-span-3">
          <label className={label}>
            Excerpt <span className="font-normal text-gray-400">shown on cards and in search results</span>
          </label>
          <textarea name="excerpt" rows={2} defaultValue={post?.excerpt} className={input} />
        </div>

        <div className="lg:col-span-3">
          <label className={label}>Body</label>
          <RichTextEditor
            content={body}
            onChange={setBody}
            placeholder="Write the article…"
            imageBucket="marketing-media"
          />
        </div>

        <div>
          <label className={label}>Category</label>
          <select name="category" defaultValue={post?.category ?? "General"} className={input}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Author</label>
          <input
            name="authorName"
            defaultValue={post?.authorName ?? "Secure Place to Work"}
            className={input}
          />
        </div>

        <div>
          <label className={label}>
            Author role <span className="font-normal text-gray-400">optional</span>
          </label>
          <input name="authorRole" defaultValue={post?.authorRole ?? ""} className={input} />
        </div>

        <div className="lg:col-span-2">
          <label className={label}>
            Tags <span className="font-normal text-gray-400">comma separated</span>
          </label>
          <input
            name="tags"
            defaultValue={post?.tags.join(", ")}
            placeholder="drills, emergency-response"
            className={input}
          />
        </div>

        <div className="lg:col-span-2">
          <ImageUploader
            bucket="marketing-media"
            folder="blog"
            value={coverPath}
            previewUrl={post?.coverUrl}
            onChange={setCoverPath}
            hint="Shown on the article card and at the top of the post. Landscape works best."
          />
        </div>

        <div className="lg:col-span-3 border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Search engine listing
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className={label}>
                SEO title <span className="font-normal text-gray-400">falls back to the title</span>
              </label>
              <input name="seoTitle" defaultValue={post?.seoTitle ?? ""} className={input} />
            </div>
            <div>
              <label className={label}>
                SEO description <span className="font-normal text-gray-400">falls back to the excerpt</span>
              </label>
              <input
                name="seoDescription"
                defaultValue={post?.seoDescription ?? ""}
                className={input}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={post?.status ?? "draft"} className={input}>
            <option value="draft">Draft — not on the website</option>
            <option value="published">Published — live</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={post?.isFeatured}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-700">Feature on the resources page</span>
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {post ? "Save changes" : "Create article"}
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
