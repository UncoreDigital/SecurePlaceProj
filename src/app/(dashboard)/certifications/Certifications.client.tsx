"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, Pencil, Download, Printer } from "lucide-react";
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
  certificate_details?: string;
  description?: string;
  firm?: string;
  firm_logo?: string;
  issue_date?: string;
  signature?: string;
};

interface CertificationsClientProps {
  initialCertificates: CertItem[];
  userRole: string;
}

// Download certificate by rendering the actual HTML template (same as view mode)
const downloadCertificate = async (cert: CertItem) => {
  try {
    // Format date with ordinal suffix
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      try {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const d = parseInt(day);
        const suffix = ["th","st","nd","rd"][((d-20)%10)||d] || ["th","st","nd","rd"][d] || "th";
        return `${d}${suffix} of ${months[date.getMonth()]} ${year}`;
      } catch { return dateStr; }
    };

    // Fetch the HTML template and replace placeholders
    const html = await fetch('/images/certificate-participation.html').then(r => r.text());
    let filledHtml = html
      .replace(/\{\{FirmName\}\}/g, cert.firm || '')
      .replace(/\{\{FirmLogo\}\}/g, cert.firm_logo || '')
      .replace(/\{\{Title\}\}/g, cert.title || '')
      .replace(/\{\{Date\}\}/g, formatDate(cert.issue_date))
      .replace(/\{\{Details\}\}/g, cert.certificate_details || '')
      .replace(/\{\{Description\}\}/g, cert.description || '')
      .replace(/\{\{Recipient\}\}/g, '')
      .replace(/padding-bottom: 4px/, 'padding-bottom: 15px');

    // Create a hidden iframe, render the certificate, then capture it
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '960px';
    iframe.style.height = '680px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = filledHtml;
    });

    // Wait for fonts/images inside iframe to load
    await new Promise(r => setTimeout(r, 800));

    const html2canvas = (await import('html2canvas')).default;
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) throw new Error('Could not access iframe document');

    const certElement = iframeDoc.querySelector('.certificate') as HTMLElement || iframeDoc.body;

    const canvas = await html2canvas(certElement, {
      width: 960,
      height: 680,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scrollY: 0,
      scrollX: 0,
      windowWidth: 960,
      windowHeight: 680,
    });

    document.body.removeChild(iframe);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = cert.title ? cert.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'certificate';
      link.download = `certificate-${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);

  } catch (error) {
    console.error('Error downloading certificate:', error);
    alert(`Failed to download certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Print certificate using the same HTML template
const printCertificate = async (cert: CertItem) => {
  try {
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      try {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const d = parseInt(day);
        const suffix = ["th","st","nd","rd"][((d-20)%10)||d] || ["th","st","nd","rd"][d] || "th";
        return `${d}${suffix} of ${months[date.getMonth()]} ${year}`;
      } catch { return dateStr; }
    };

    const html = await fetch('/images/certificate-participation.html').then(r => r.text());
    const filledHtml = html
      .replace(/\{\{FirmName\}\}/g, cert.firm || '')
      .replace(/\{\{FirmLogo\}\}/g, cert.firm_logo || '')
      .replace(/\{\{Title\}\}/g, cert.title || '')
      .replace(/\{\{Date\}\}/g, formatDate(cert.issue_date))
      .replace(/\{\{Details\}\}/g, cert.certificate_details || '')
      .replace(/\{\{Description\}\}/g, cert.description || '')
      .replace(/\{\{Recipient\}\}/g, '');

    const printWindow = window.open('', '_blank', 'width=1000,height=750');
    if (!printWindow) return;
    printWindow.document.write(filledHtml);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  } catch (error) {
    console.error('Error printing certificate:', error);
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
  const router = useRouter();

  const hasItems = items.length > 0;

  const handleEditSave = (updatedData: any) => {
    if (selected) {
      // Update the item in the local state
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === selected.id 
            ? { 
                ...item, 
                title: updatedData.title,
                certificate_details: updatedData.certificateDetails,
                description: updatedData.description,
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-black text-white text-sm font-medium cursor-pointer hover:bg-gray-800"
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
                  <th className="py-2 pr-4">Firm</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b text-sm">
                    <td className="py-2 pr-4">{c.title}</td>
                    <td className="py-2 pr-4">{c.firm || '-'}</td>
                    <td className="py-2 pr-4">{c.issue_date || '-'}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        {userRole === "super_admin" && (
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-700 hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              setSelected(c);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                        )}
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-700 hover:bg-slate-50 cursor-pointer"
                          onClick={() => {
                            setSelected(c);
                            setOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-700 hover:bg-slate-50 cursor-pointer"
                          onClick={() => downloadCertificate(c)}
                        >
                          <Download className="w-4 h-4" />Download
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-700 hover:bg-slate-50 cursor-pointer"
                          onClick={() => printCertificate(c)}
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
        <DialogContent className="w-[90vw] max-w-[1800px] h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Certificate - {selected?.title || 'Certificate'}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {selected && (
              <CertificateCreator
                initial={{
                  title: selected.title,
                  certificateDetails: selected.certificate_details,
                  description: selected.description,
                  firm: selected.firm,
                  firmLogo: selected.firm_logo,
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
          }
        }}
      >
        <DialogContent className="w-[90vw] max-w-[1800px] h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title || 'Certificate'}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {selected && (
              <div className="space-y-4">
                <CertificateCreator
                  initial={{
                    title: selected.title,
                    certificateDetails: selected.certificate_details,
                    description: selected.description,
                    firm: selected.firm,
                    date: selected.issue_date,
                    signature: selected.signature,
                    firmLogo: selected.firm_logo
                  }}
                  showSave={false}
                  showPrint={false}
                  previewOnly={true}
                />
                <div className="flex justify-center gap-3">
                  {/* <button 
                    type="button" 
                    onClick={() => window.print()} 
                    className="px-4 py-2 rounded bg-brand-orange text-white text-sm font-medium hover:bg-orange-600"
                  >
                    Print
                  </button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      await downloadCertificate({
                        recipient: selected.recipient,
                        title: selected.title,
                        firm: selected.firm,
                        date: selected.issue_date,
                        signature: selected.signature,
                      });
                    }}
                    className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                  >
                    Download
                  </button> */}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}