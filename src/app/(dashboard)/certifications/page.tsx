"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus, PlusCircle, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CertificateCreator from "../components/CertificateCreator";
import { Button } from "@/components/ui/button";

type CertItem = {
  id: string;
  title: string;
  recipient: string;
  firm?: string;
  date?: string;
  signature?: string;
};

const STORAGE_LIST_KEY = "secure_place_certs";

export default function CertificationsLandingPage() {
  const [items, setItems] = useState<CertItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CertItem | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_LIST_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const hasItems = items.length > 0;

  // If autoPrint is requested, trigger print shortly after the dialog opens
  useEffect(() => {
    if (open && autoPrint) {
      const t = setTimeout(() => {
        try { window.print(); } catch {}
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open, autoPrint]);

  return (
    <div className="space-y-4">
      <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2">
        <span>Home</span>
        <span>&gt;</span>
        <span>Certifications</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certifications</h1>
        <Link
          href="/certifications/new"
          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-black text-white text-sm font-medium"
        >
          <PlusCircle className="w-4 h-4" /> Create Certificate
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        {!hasItems ? (
          <p className="text-slate-500 text-sm">No certifications yet. Click "Create Certificate" to add one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-sm text-slate-600 border-b">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Recipient</th>
                  <th className="py-2 pr-4">Firm</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b text-sm">
                    <td className="py-2 pr-4">{c.title}</td>
                    <td className="py-2 pr-4">{c.recipient}</td>
                    <td className="py-2 pr-4">{c.firm || '-'}</td>
                    <td className="py-2 pr-4">{c.date || '-'}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setSelected(c);
                            setAutoPrint(false);
                            setOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setSelected(c);
                            setAutoPrint(true);
                            setOpen(true);
                          }}
                        >
                          <Printer className="w-4 h-4" />Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Centralized dialog for viewing/printing a certificate */}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setSelected(null);
            setAutoPrint(false);
          }
        }}
      >
        <DialogContent className="w-[98vw] max-w-[1100px] h-[92vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title || 'Certificate'}</DialogTitle>
          </DialogHeader>
          <div className="pt-2 flex items-center justify-center">
            {selected && (
              <CertificateCreator
                initial={{
                  title: selected.title,
                  recipient: selected.recipient,
                  firm: selected.firm,
                  date: selected.date,
                  signature: selected.signature,
                }}
                showSave={false}
                showPrint={true}
                previewOnly={true}
                persistKey={null}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
