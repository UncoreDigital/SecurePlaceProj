"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, Printer, Pencil, Download } from "lucide-react";
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

// Extract the download logic to be reusable
const downloadCertificate = async (certificateData: {
  recipient: string;
  title: string;
  firm?: string;
  date?: string;
  signature?: string;
}) => {
  try {
    // Get the certificate element to measure its actual dimensions
    const certificateElement = document.getElementById("certificate-print");
    if (!certificateElement) {
      alert("Certificate element not found");
      return;
    }

    // Load the background image
    const bgImage = new Image();
    bgImage.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      bgImage.onload = resolve;
      bgImage.onerror = () => reject(new Error('Failed to load background image'));
      bgImage.src = '/images/certificate-bg.png';
    });

    // Get the actual rendered dimensions of the certificate
    const rect = certificateElement.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Create canvas with high resolution
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Failed to get canvas context');
      return;
    }

    // Set canvas dimensions to match display aspect ratio but higher resolution
    canvas.width = 1200;
    canvas.height = Math.round(1200 / (displayWidth / displayHeight));

    // Draw background image
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // Scale factor for converting display coordinates to canvas coordinates
    const scaleX = canvas.width / displayWidth;
    const scaleY = canvas.height / displayHeight;

    // Get all text elements and their positions
    const textElements = certificateElement.querySelectorAll('span');
    
    textElements.forEach((element, index) => {
      const textRect = element.getBoundingClientRect();
      const text = element.textContent || '';
      
      // Calculate position relative to certificate container
      let x = (textRect.left - rect.left + textRect.width / 2) * scaleX;
      let y = (textRect.top - rect.top + textRect.height / 2) * scaleY;
      
      // Adjust signature and date (2nd and 3rd elements) down by 1%
      if (index === 1 || index === 2) {
        y += canvas.height * 0.01;
      }
      
      // Get computed styles
      const styles = window.getComputedStyle(element);
      const fontSize = parseFloat(styles.fontSize) * scaleX;
      const fontWeight = styles.fontWeight;
      const color = styles.color;
      const fontFamily = styles.fontFamily;
      
      // Set font
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw text
      ctx.fillText(text, x, y);
    });

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Failed to create image blob');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = certificateData.recipient ? certificateData.recipient.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'certificate';
      link.download = `certificate-${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);

  } catch (error) {
    console.error('Error generating certificate image:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Failed to load background image')) {
      alert('Failed to load certificate background image. Please check that /images/certificate-bg.png exists.');
    } else {
      alert(`Failed to download certificate: ${errorMessage}`);
    }
  }
};

export default function CertificationsClient({ 
  initialCertificates, 
  userRole 
}: CertificationsClientProps) {
  const [items, setItems] = useState<CertItem[]>(initialCertificates);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<CertItem | null>(null);
  const [autoDownload, setAutoDownload] = useState(false);
  const router = useRouter();

  const hasItems = items.length > 0;

  // If autoDownload is requested, trigger download shortly after the dialog opens
  useEffect(() => {
    if (open && autoDownload && selected) {
      const t = setTimeout(() => {
        downloadCertificate({
          recipient: selected.recipient,
          title: selected.title,
          firm: selected.firm,
          date: selected.issue_date,
          signature: selected.signature,
        });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [open, autoDownload, selected]);

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
                            setAutoDownload(false);
                            setOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setSelected(c);
                            setAutoDownload(true);
                            setOpen(true);
                          }}
                        >
                          <Download className="w-4 h-4" />Download
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
            setAutoDownload(false);
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