"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, ChartNoAxesColumn, Pencil, X, ChevronRight, Search, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 10;

interface SafetyClassWithForm {
  id: string;
  title: string;
  mode: string;
  type: string;
  form: {
    id: string;
    title: string;
    pass_score: number;
  } | null;
}

export default function FormManagementClient({
  classes,
}: {
  classes: SafetyClassWithForm[];
}) {
  const router = useRouter();

  // Main list state
  const [listSearch, setListSearch] = useState("");
  const [page, setPage] = useState(1);
  // Tracks which row+action is currently navigating (e.g. "abc-123:analytics")
  const [navKey, setNavKey] = useState<string | null>(null);

  // Modal state
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  // Filtered main list
  const filteredList = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.mode.toLowerCase().includes(q)
    );
  }, [classes, listSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedList = filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleListSearch = (v: string) => {
    setListSearch(v);
    setPage(1);
  };

  // Modal filtered classes (no form yet)
  const classesWithoutForm = classes.filter((c) => !c.form);
  const modalFiltered = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return classesWithoutForm;
    return classesWithoutForm.filter((c) => c.title.toLowerCase().includes(q));
  }, [classesWithoutForm, modalSearch]);

  const handleSelectClass = (classId: string) => {
    setNavKey(`${classId}:create`);
    router.push(`/safety-classes/${classId}/form-builder`);
  };

  const goto = (classId: string, action: "analytics" | "edit" | "create") => {
    setNavKey(`${classId}:${action}`);
    const path = action === "analytics" ? "analytics" : "form-builder";
    router.push(`/safety-classes/${classId}/${path}`);
  };

  const spinner = (
    <div className="animate-spin h-3.5 w-3.5 mr-1 border-2 border-brand-blue border-t-transparent rounded-full" />
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="text-sm text-gray-500 mb-1">Home &gt; Forms</nav>
          <h1 className="text-3xl font-bold text-brand-blue">Forms</h1>
        </div>
        <Button
          onClick={() => setSelectModalOpen(true)}
          className="bg-brand-blue hover:bg-brand-blue/90"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Form
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by title, type, or mode..."
          value={listSearch}
          onChange={(e) => handleListSearch(e.target.value)}
          className="pl-9 pr-4"
        />
        {listSearch && (
          <button
            onClick={() => handleListSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Class list */}
      {classes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">No safety classes found.</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No classes match "{listSearch}"</p>
          <button onClick={() => handleListSearch("")} className="text-brand-blue text-sm mt-2 hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {pagedList.map((sc) => (
              <Card key={sc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{sc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{sc.mode === "InPerson" ? "In-Person" : sc.mode}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{sc.type}</span>
                      {sc.form ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          <FileText className="h-3 w-3" /> Form active
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                          No form
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {sc.form ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={navKey !== null}
                          onClick={() => goto(sc.id, "analytics")}
                          className="text-xs disabled:opacity-60 disabled:cursor-wait"
                        >
                          {navKey === `${sc.id}:analytics` ? spinner : <ChartNoAxesColumn className="h-3.5 w-3.5 mr-1" />}
                          Analytics
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={navKey !== null}
                          onClick={() => goto(sc.id, "edit")}
                          className="text-xs disabled:opacity-60 disabled:cursor-wait"
                        >
                          {navKey === `${sc.id}:edit` ? spinner : <Pencil className="h-3.5 w-3.5 mr-1" />}
                          Edit Form
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        disabled={navKey !== null}
                        onClick={() => goto(sc.id, "create")}
                        className="text-xs bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-60 disabled:cursor-wait"
                      >
                        {navKey === `${sc.id}:create` ? spinner : <Plus className="h-3.5 w-3.5 mr-1" />}
                        Create Form
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredList.length)} of {filteredList.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <Button
                      key={p}
                      size="sm"
                      variant={safePage === p ? "default" : "outline"}
                      onClick={() => setPage(p as number)}
                      className={`h-8 w-8 p-0 ${safePage === p ? "bg-brand-blue hover:bg-brand-blue/90" : ""}`}
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Form — Select Class Modal */}
      {selectModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Select Safety Class</h2>
                <p className="text-xs text-gray-500 mt-0.5">Choose a class to create a form for</p>
              </div>
              <button
                onClick={() => { setSelectModalOpen(false); setModalSearch(""); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b">
              <input
                type="text"
                placeholder="Search classes..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-brand-blue"
              />
            </div>

            <div className="overflow-y-auto flex-1 px-3 py-2">
              {modalFiltered.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {classesWithoutForm.length === 0
                    ? "All safety classes already have forms."
                    : "No classes match your search."}
                </div>
              ) : (
                modalFiltered.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectClass(sc.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 text-left transition-colors group"
                  >
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{sc.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sc.mode === "InPerson" ? "In-Person" : sc.mode} · {sc.type}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-blue" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
