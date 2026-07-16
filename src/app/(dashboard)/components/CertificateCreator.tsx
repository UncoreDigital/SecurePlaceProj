"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useFirms } from "@/hooks/useFirms";
import { formatDateForCertificate, isValidIsoDate } from "@/lib/certificate-date";

type CertificateData = {
  title: string;
  certificateDetails: string;
  description: string;
  locationId: string;   // UUID of the selected location
  firm: string;
  firmLogo: string;
  date: string;         // ISO "YYYY-MM-DD", matching <input type="date">
  signature: string;
};

function CertificatePreview({ data }: { data: CertificateData }) {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    // Fetch and update the HTML template with dynamic data
    fetch('/images/certificate-participation.html')
      .then(res => res.text())
      .then(html => {
        const formattedDate = formatDateForCertificate(data.date) || '{{date}}';

        // Replace placeholders with actual data
        let updatedHtml = html
          .replace(/\{\{FirmName\}\}/g, data.firm || '{{firmName}}')
          .replace(/\{\{FirmLogo\}\}/g, data.firmLogo || '')
          .replace(/\{\{Title\}\}/g, data.title || '{{title}}')
          .replace(/\{\{Date\}\}/g, formattedDate)
          .replace(/\{\{Details\}\}/g, data.certificateDetails || '{{details}}')
          .replace(/\{\{Description\}\}/g, data.description || '{{description}}');
        
        setHtmlContent(updatedHtml);
      })
      .catch(err => console.error('Failed to load certificate template:', err));
  }, [data.firm, data.firmLogo, data.title, data.date, data.description, data.certificateDetails]);

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'hidden',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          transform: 'scale(0.65)',
          transformOrigin: 'top center',
          marginBottom: '-238px', // compensate for scale shrink: 680 * (1 - 0.65) = 238
        }}
      >
        <div
          id="certificate-print"
          className="relative overflow-hidden"
          style={{
            width: '960px',
            height: '680px',
            background: '#f5f0eb',
            border: '6px solid #1c2a4a',
            overflow: 'hidden',
          }}
        >
          {htmlContent && (
            <iframe
              srcDoc={htmlContent}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                zIndex: 1,
                overflow: 'hidden',
              }}
              scrolling="no"
              sandbox="allow-same-origin allow-scripts"
              title="Certificate Background"
            />
          )}
        </div>
      </div>
    </div>
  );
}

type LocationOption = { id: string; name: string };

// Stable empty reference, so clearing locations twice is a no-op re-render
// rather than a new array that always compares unequal.
const NO_LOCATIONS: LocationOption[] = [];

export default function CertificateCreator({
  initial,
  onSave,
  showSave = true,
  showPrint = true,
  previewOnly = false,
  isEditing = false,
  certificateId,
}: {
  initial?: Partial<CertificateData>;
  onSave?: (data: CertificateData) => void;
  showSave?: boolean;
  showPrint?: boolean;
  previewOnly?: boolean;
  isEditing?: boolean;
  certificateId?: string;
}) {
  const { user, loading: userLoading } = useUser();
  const { firms, loading: loadingFirms } = useFirms();
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [form, setForm] = useState<CertificateData>({
    title: initial?.title ?? "",
    certificateDetails: initial?.certificateDetails ?? "",
    description: initial?.description ?? "",
    locationId: initial?.locationId ?? "",
    firm: initial?.firm ?? "",
    firmLogo: initial?.firmLogo ?? "",
    date: initial?.date ?? "",
    signature: initial?.signature ?? "",
  });

  // Sync form when initial prop changes (e.g. opening a different cert in edit dialog)
  useEffect(() => {
    setForm({
      title: initial?.title ?? "",
      certificateDetails: initial?.certificateDetails ?? "",
      description: initial?.description ?? "",
      locationId: initial?.locationId ?? "",
      firm: initial?.firm ?? "",
      firmLogo: initial?.firmLogo ?? "",
      date: initial?.date ?? "",
      signature: initial?.signature ?? "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initial?.title,
    initial?.certificateDetails,
    initial?.description,
    initial?.locationId,
    initial?.firm,
    initial?.firmLogo,
    initial?.date,
    initial?.signature,
  ]);

  // Auto-select firm once firms are loaded
  useEffect(() => {
    if (!firms.length) return;

    if (user?.role === "firm_admin" && firms.length === 1 && !initial?.firm) {
      setForm(prev => ({ ...prev, firm: firms[0].name, firmLogo: firms[0].logo_url ?? "" }));
    } else if (initial?.firm) {
      const matchedFirm = firms.find(f => f.name === initial.firm);
      if (matchedFirm) {
        setForm(prev => ({
          ...prev,
          firm: prev.firm || initial.firm!,
          firmLogo: prev.firmLogo || (matchedFirm.logo_url ?? ""),
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firms]);

  // Depend on the firm's id, not the firms array: a primitive can't change
  // identity between renders, so the effect below can't re-run in a loop.
  const selectedFirmId = useMemo(
    () => firms.find(f => f.name === form.firm)?.id,
    [firms, form.firm]
  );

  // Fetch locations whenever the selected firm changes
  useEffect(() => {
    if (!selectedFirmId) {
      setLocations(NO_LOCATIONS);
      return;
    }

    let cancelled = false;
    setLoadingLocations(true);
    fetch(`/api/locations?firm_id=${selectedFirmId}`)
      .then(res => res.json())
      .then((data: LocationOption[]) => {
        if (!cancelled) setLocations(Array.isArray(data) ? data : NO_LOCATIONS);
      })
      .catch(() => {
        if (!cancelled) setLocations(NO_LOCATIONS);
      })
      .finally(() => {
        if (!cancelled) setLoadingLocations(false);
      });

    // Ignore a response that lands after the firm changed again.
    return () => { cancelled = true; };
  }, [selectedFirmId]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "firm") {
      const selectedFirm = firms.find(f => f.name === value);
      setForm((f) => ({ ...f, firm: value, firmLogo: selectedFirm?.logo_url ?? "", locationId: "" }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleDownload = async () => {
    try {
      const html = await fetch('/images/certificate-participation.html').then(r => r.text());
      const filledHtml = html
        .replace(/\{\{FirmName\}\}/g, form.firm || '')
        .replace(/\{\{FirmLogo\}\}/g, form.firmLogo || '')
        .replace(/\{\{Title\}\}/g, form.title || '')
        .replace(/\{\{Date\}\}/g, formatDateForCertificate(form.date))
        .replace(/\{\{Details\}\}/g, form.certificateDetails || '')
        .replace(/\{\{Description\}\}/g, form.description || '');

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
        const fileName = form.title ? form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'certificate';
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

  const handleSave = async () => {
    if (!user) {
      alert("You must be logged in to save certificates");
      return;
    }

    // Validate required fields
    if (!form.firm.trim()) {
      alert("Please select a firm");
      return;
    }

    if (!isValidIsoDate(form.date)) {
      alert("Please select a valid date");
      return;
    }

    // Never let the button spin forever: if the request stalls, abort and say so.
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 30_000);

    try {
      setSaving(true);

      const res = await fetch("/api/certificates", {
        method: isEditing && certificateId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          id: isEditing ? certificateId : undefined,
          title: form.title,
          certificateDetails: form.certificateDetails,
          description: form.description,
          locationId: form.locationId,
          firm: form.firm,
          date: form.date,
          signature: form.signature,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        alert(error ?? "Failed to save certificate");
        return;
      }

      if (onSave) {
        onSave(form);
      } else {
        alert(isEditing ? "Certificate updated successfully!" : "Certificate saved successfully!");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        alert("Saving timed out. Please check your connection and try again.");
      } else {
        console.error("Failed to save certificate:", error);
        alert("An unexpected error occurred while saving the certificate");
      }
    } finally {
      clearTimeout(timeout);
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Print-only CSS */}
      <style jsx global>{`
                @media print {
          body * { visibility: hidden !important; }
          #certificate-print, #certificate-print * { visibility: visible !important; }
          #certificate-print { 
            position: absolute !important; 
            inset: 0 !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            box-shadow: none !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        @page { size: A4; margin: 16mm; }
      `}</style>

      {/* Form */}
      {!previewOnly && (
      <section className="lg:col-span-4 bg-white rounded-xl shadow p-4 print:hidden">
        <h2 className="font-semibold text-slate-800 mb-3">Certificate Details</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Firm Name</label>
            {loadingFirms ? (
              <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500">
                Loading firms...
              </div>
            ) : firms.length === 0 ? (
              <div className="w-full border rounded px-3 py-2 text-sm bg-red-50 text-red-600">
                No firms available. Please contact administrator.
              </div>
            ) : (
              <select 
                name="firm" 
                value={form.firm} 
                onChange={onChange} 
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 bg-white"
              >
                <option value="">Select a firm...</option>
                {firms.map((firm) => (
                  <option key={firm.id} value={firm.name}>
                    {firm.name}
                  </option>
                ))}
              </select>
            )}
            
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Title</label>
            <input name="title" value={form.title} onChange={onChange} placeholder="Certificate Title" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date</label>
              <input type="date" name="date" value={form.date} onChange={onChange} className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
            </div>
            {/* <div>
              <label className="block text-sm text-slate-600 mb-1">Signature</label>
              <input name="signature" value={form.signature} onChange={onChange} placeholder="Signer name" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
            </div> */}
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Certificate Details</label>
            <input name="certificateDetails" value={form.certificateDetails} onChange={onChange} placeholder="Certificate Details" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Description</label>
            <input name="description" value={form.description} onChange={onChange} placeholder="Certificate Description" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Location</label>
            {loadingLocations ? (
              <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500">
                Loading locations...
              </div>
            ) : !form.firm ? (
              <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-400">
                Select a firm first
              </div>
            ) : locations.length === 0 ? (
              <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-400">
                No locations available for this firm
              </div>
            ) : (
              <select
                name="locationId"
                value={form.locationId}
                onChange={onChange}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 bg-white"
              >
                <option value="">Select a location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="pt-2 flex items-center gap-3">
            {showSave && (
              <button 
                type="button" 
                onClick={handleSave} 
                disabled={saving || !user || userLoading}
                className="px-4 py-2 rounded bg-brand-blue text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? "Saving..." : (isEditing ? "Update" : "Save")}
              </button>
            )}
            {/* {showPrint && (
              <button type="button" onClick={handleDownload} className="px-4 py-2 rounded bg-brand-orange text-white text-sm font-medium hover:bg-orange-600 cursor-pointer">Print</button>
            )} */}
            {/* <button type="button" onClick={handleDownload} className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700">Download</button> */}
          </div>
        </div>
      </section>
      )}

      {/* Preview */}
      <section 
        id="certificate-print" 
        className={`${previewOnly ? 'lg:col-span-12' : 'lg:col-span-8'} rounded-xl p-4 print:col-span-12`}
        style={{ backgroundColor: 'rgb(248, 250, 252)' }}
      >
        <CertificatePreview data={form} />
      </section>
    </div>
  );
}
