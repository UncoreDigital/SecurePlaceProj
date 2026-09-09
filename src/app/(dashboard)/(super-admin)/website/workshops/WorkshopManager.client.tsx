"use client";

import { useState } from "react";
import type { WorkshopRow, WorkshopModule } from "./types";
import ImageUploader from "../_lib/ImageUploader.client";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { ActionResult } from "../_lib/marketing";

type Action = (fd: FormData) => Promise<ActionResult>;

type Props = {
  workshops: WorkshopRow[];
  saveWorkshop: Action;
  deleteWorkshop: Action;
};

const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
const label = "block text-xs font-semibold text-gray-600 mb-1";

export default function WorkshopManager({
  workshops,
  saveWorkshop,
  deleteWorkshop,
}: Props) {
  const [editing, setEditing] = useState<WorkshopRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WorkshopRow | null>(null);

  if (creating || editing) {
    return (
      <WorkshopEditor
        workshop={editing}
        saveWorkshop={saveWorkshop}
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
          New workshop
        </button>
      </div>

      {workshops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold text-gray-700">No workshops yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Workshop</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workshops.map((w) => (
                <tr key={w.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{w.title}</div>
                    <div className="mt-0.5 font-mono text-xs text-gray-400">/{w.slug}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{w.format}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {Math.round(w.durationMinutes / 60)} hr
                  </td>
                  <td className="px-4 py-3 text-gray-500">{w.displayOrder}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        w.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(w)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(w)}
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
        title="Delete this workshop?"
        description={
          <>
            <span className="font-medium text-gray-900">{pendingDelete?.title}</span>{" "}
            will be removed permanently. This cannot be undone.
          </>
        }
        confirmLabel="Delete workshop"
        onConfirm={async () => {
          if (!pendingDelete) return;
          const fd = new FormData();
          fd.set("id", pendingDelete.id);
          const result = await deleteWorkshop(fd);
          // Returning the message keeps the dialog open with the reason on it.
          if (!result.ok) return result.error;
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

/* -------------------------------- editor -------------------------------- */

function WorkshopEditor({
  workshop,
  saveWorkshop,
  onDone,
}: {
  workshop: WorkshopRow | null;
  saveWorkshop: Action;
  onDone: () => void;
}) {
  const [saveError, setSaveError] = useState("");
  const [modules, setModules] = useState<WorkshopModule[]>(workshop?.modules ?? []);
  const [coverPath, setCoverPath] = useState(workshop?.coverPath ?? "");

  const updateModule = (i: number, patch: Partial<WorkshopModule>) =>
    setModules((m) => m.map((mod, idx) => (idx === i ? { ...mod, ...patch } : mod)));

  const totalModuleMinutes = modules.reduce((sum, m) => sum + (Number(m.minutes) || 0), 0);

  return (
    <form
      action={async (fd) => {
        const result = await saveWorkshop(fd);
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
          <span className="font-semibold">Could not save this workshop. </span>
          {saveError}
        </div>
      )}

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {workshop ? "Edit workshop" : "New workshop"}
        </h2>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700"
        >
          Back to list
        </button>
      </div>

      {workshop && <input type="hidden" name="id" value={workshop.id} />}
      {workshop?.publishedAt && (
        <input type="hidden" name="publishedAt" value={workshop.publishedAt} />
      )}
      <input type="hidden" name="modules" value={JSON.stringify(modules)} />
      <input type="hidden" name="coverUrl" value={coverPath} />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <label className={label}>Title</label>
          <input name="title" required defaultValue={workshop?.title} className={input} />
        </div>
        <div>
          <label className={label}>Slug</label>
          <input name="slug" defaultValue={workshop?.slug} className={input} />
        </div>

        <div className="lg:col-span-4">
          <label className={label}>Summary</label>
          <textarea name="summary" rows={2} defaultValue={workshop?.summary} className={input} />
        </div>

        <div className="lg:col-span-4">
          <label className={label}>
            Description <span className="font-normal text-gray-400">HTML</span>
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={workshop?.description}
            className={input}
          />
        </div>

        <div>
          <label className={label}>Format</label>
          <select name="format" defaultValue={workshop?.format ?? "onsite"} className={input}>
            <option value="onsite">On site</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className={label}>Duration (minutes)</label>
          <input
            type="number"
            name="durationMinutes"
            min={15}
            step={15}
            defaultValue={workshop?.durationMinutes ?? 120}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Min participants</label>
          <input
            type="number"
            name="minParticipants"
            min={1}
            defaultValue={workshop?.minParticipants ?? ""}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Max participants</label>
          <input
            type="number"
            name="maxParticipants"
            min={1}
            defaultValue={workshop?.maxParticipants ?? ""}
            className={input}
          />
        </div>

        <div className="lg:col-span-2">
          <label className={label}>Audience</label>
          <input
            name="audience"
            defaultValue={workshop?.audience ?? ""}
            placeholder="Floor wardens, security staff…"
            className={input}
          />
        </div>

        <div className="lg:col-span-2">
          <ImageUploader
            bucket="marketing-media"
            folder="workshops"
            value={coverPath}
            previewUrl={workshop?.coverUrl}
            onChange={setCoverPath}
            hint="Shown on the workshop card and detail page. Landscape works best."
          />
        </div>

        <div>
          <label className={label}>Display order</label>
          <input
            type="number"
            name="displayOrder"
            defaultValue={workshop?.displayOrder ?? 0}
            className={input}
          />
        </div>

        <div className="lg:col-span-4">
          <label className={label}>
            Outcomes <span className="font-normal text-gray-400">one per line</span>
          </label>
          <textarea
            name="outcomes"
            rows={4}
            defaultValue={workshop?.outcomes.join("\n")}
            placeholder={"Evacuate your floor within a measured time\nRun a roll call at the assembly point"}
            className={input}
          />
        </div>

        {/* Modules */}
        <div className="lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <label className={label}>Session outline</label>
            <span className="text-xs text-gray-400">
              {totalModuleMinutes} min across {modules.length} module
              {modules.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {modules.map((mod, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_7rem_auto]">
                  <input
                    value={mod.title}
                    onChange={(e) => updateModule(i, { title: e.target.value })}
                    placeholder="Module title"
                    className={input}
                  />
                  <input
                    type="number"
                    value={mod.minutes}
                    onChange={(e) => updateModule(i, { minutes: Number(e.target.value) })}
                    placeholder="Minutes"
                    className={input}
                  />
                  <button
                    type="button"
                    onClick={() => setModules((m) => m.filter((_, idx) => idx !== i))}
                    className="rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600"
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={(mod.points ?? []).join(", ")}
                  onChange={(e) =>
                    updateModule(i, {
                      points: e.target.value
                        .split(",")
                        .map((p) => p.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Points, comma separated"
                  className={`${input} mt-2`}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setModules((m) => [...m, { title: "", minutes: 30, points: [] }])}
            className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"
          >
            Add module
          </button>
        </div>

        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={workshop?.status ?? "draft"} className={input}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={workshop?.isFeatured}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-700">Feature on the home page</span>
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {workshop ? "Save changes" : "Create workshop"}
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
