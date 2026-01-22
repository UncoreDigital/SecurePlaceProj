"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, Printer, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CertificateCreator from "../components/CertificateCreator";
import { Button } from "@/components/ui/button";

type CertItem = {
  id: string;
  title: string;
  recipient: string;
  firm?: string;
  issue_date?: string;
  signature?: string;
};

interface CertificationsClientProps {
  initialCertificates: CertItem[];
  userRole: string;
}

export default function CertificationsClient({ 
  initialCertificates, 
  userRole 
}: CertificationsClientProps) {
  const [items, setItems] = useState<CertItem[]>(initialCertificates);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<CertItem | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const router = useRouter();

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

  const handleEditSave = (updatedData: any) => {
    if (selected) {
      // Update the item in the local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === selected.id 
            ? { 
                ...item, 
                title: updatedData.title,
                recipient: updatedData.recipient,
                firm: updatedData.firm,
                issue_date: updatedData.date,
                signature: updatedData.signature
              }
            : item
        )
      );
      setEditOpen(false);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-4">
      <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2">
        <span>Home</span>
        <span>&gt;</span>
        <span>Certifications</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certifications</h1>
        {userRole === "super_admin" && (
          <Button
            onClick={() => router.push('/certifications/new')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-black text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Create Certificate
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        {!hasItems ? (
          <p className="text-slate-500 text-sm">
            {userRole === "super_admin" 
              ? 'No certifications yet. Click "Create Certificate" to add one.'
              : 'No certifications available.'
            }
          </p>
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
                    <td className="py-2 pr-4">{c.issue_date || '-'}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        {userRole === "super_admin" && (
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setSelected(c);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                        )}
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
      
      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) {
            setSelected(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[1600px] h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Certificate - {selected?.title || 'Certificate'}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {selected && (
              <CertificateCreator
                initial={{
                  title: selected.title,
                  recipient: selected.recipient,
                  firm: selected.firm,
                  date: selected.issue_date,
                  signature: selected.signature,
                }}
                onSave={handleEditSave}
                showSave={true}
                showPrint={false}
                previewOnly={false}
                isEditing={true}
                certificateId={selected.id}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="w-[95vw] max-w-[1600px] h-[95vh] overflow-auto">
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
                  date: selected.issue_date,
                  signature: selected.signature,
                }}
                showSave={false}
                showPrint={true}
                previewOnly={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}