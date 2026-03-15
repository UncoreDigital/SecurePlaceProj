"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useUser";

type CertificateData = {
  recipient: string;
  title: string;
  certificateDetails: string;
  description: string;
  firm: string;
  firmLogo: string;
  date: string;
  signature: string;
};

interface Firm {
  id: string;
  name: string;
  logo_url?: string;
}

function CertificatePreview({ data }: { data: CertificateData }) {
  const [htmlContent, setHtmlContent] = useState<string>('');

  // Format date for display with ordinal suffix
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "{{date}}";
    try {
      const [day, month, year] = dateStr.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const d = parseInt(day);
      const suffix = ["th", "st", "nd", "rd"][((d - 20) % 10) || d] || ["th", "st", "nd", "rd"][d] || "th";
      return `${d}${suffix} of ${months[date.getMonth()]} ${year}`;
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    // Fetch and update the HTML template with dynamic data
    fetch('/images/certificate-participation.html')
      .then(res => res.text())
      .then(html => {
        // Format the date
        const formattedDate = formatDate(data.date);
        
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
              sandbox="allow-same-origin"
              title="Certificate Background"
            />
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loadingFirms, setLoadingFirms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CertificateData>({
    recipient: initial?.recipient ?? "",
    title: initial?.title ?? "",
    certificateDetails: initial?.certificateDetails ?? "",
    description: initial?.description ?? "",
    firm: initial?.firm ?? "",
    firmLogo: initial?.firmLogo ?? "",
    date: initial?.date ?? "",
    signature: initial?.signature ?? "",
  });

  // Sync form when initial prop changes (e.g. opening a different cert in edit dialog)
  useEffect(() => {
    setForm({
      recipient: initial?.recipient ?? "",
      title: initial?.title ?? "",
      certificateDetails: initial?.certificateDetails ?? "",
      description: initial?.description ?? "",
      firm: initial?.firm ?? "",
      firmLogo: initial?.firmLogo ?? "",
      date: initial?.date ?? "",
      signature: initial?.signature ?? "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initial?.recipient,
    initial?.title,
    initial?.certificateDetails,
    initial?.description,
    initial?.firm,
    initial?.firmLogo,
    initial?.date,
    initial?.signature,
  ]);

  // Resolve firm logo when initial firm is set and firms are loaded
  useEffect(() => {
    if (initial?.firm && firms.length > 0) {
      const matchedFirm = firms.find(f => f.name === initial.firm);
      if (matchedFirm && !form.firmLogo) {
        setForm(prev => ({ ...prev, firmLogo: matchedFirm.logo_url ?? "" }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.firm, firms]);

  // Fetch firms data — re-runs when user is available
  useEffect(() => {
    let cancelled = false;

    const fetchFirms = async () => {
      // Don't fetch if user is still loading or not available
      if (userLoading || !user) {
        console.log('CertificateCreator: Waiting for user to load...', { userLoading, hasUser: !!user });
        setLoadingFirms(true);
        return;
      }

      console.log('CertificateCreator: Fetching firms for user:', { role: user.role, firmId: user.firmId });

      try {
        setLoadingFirms(true);

        let query = supabase
          .from("firms")
          .select("id, name, logo_url")
          .order("name", { ascending: true });

        // Filter by firm for firm_admin users
        if (user?.role === "firm_admin" && user?.firmId) {
          console.log('CertificateCreator: Filtering firms by firmId:', user.firmId);
          query = query.eq("id", user.firmId);
        }

        const { data, error } = await query;
        if (cancelled) return;

        if (error) {
          console.error("CertificateCreator: Error fetching firms:", error);
          setFirms([]);
          return;
        }

        console.log('CertificateCreator: Firms fetched successfully:', data?.length, 'firms');
        setFirms(data || []);

        // Auto-select firm for firm_admin only when no firm is pre-selected
        if (user?.role === "firm_admin" && data && data.length === 1 && !initial?.firm) {
          setForm(prev => ({ ...prev, firm: data[0].name, firmLogo: data[0].logo_url ?? "" }));
        } else if (initial?.firm && data) {
          // Resolve firmLogo from loaded firms list when editing
          const matchedFirm = data.find(f => f.name === initial.firm);
          if (matchedFirm) {
            setForm(prev => ({ ...prev, firmLogo: prev.firmLogo || (matchedFirm.logo_url ?? "") }));
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("CertificateCreator: Failed to fetch firms:", error);
          setFirms([]);
        }
      } finally {
        if (!cancelled) setLoadingFirms(false);
      }
    };

    fetchFirms();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "firm") {
      const selectedFirm = firms.find(f => f.name === value);
      setForm((f) => ({ ...f, firm: value, firmLogo: selectedFirm?.logo_url ?? "" }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const formatDate = (dateStr: string) => {
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

  const handleDownload = async () => {
    try {
      const html = await fetch('/images/certificate-participation.html').then(r => r.text());
      const filledHtml = html
        .replace(/\{\{FirmName\}\}/g, form.firm || '')
        .replace(/\{\{FirmLogo\}\}/g, form.firmLogo || '')
        .replace(/\{\{Title\}\}/g, form.title || '')
        .replace(/\{\{Date\}\}/g, formatDate(form.date))
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
        const fileName = form.recipient ? form.recipient.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'certificate';
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
    if (!form.recipient.trim()) {
      alert("Please enter a recipient name");
      return;
    }

    if (!form.firm.trim()) {
      alert("Please select a firm");
      return;
    }

    if (!form.date.trim()) {
      alert("Please enter a date");
      return;
    }

    try {
      setSaving(true);

      // Find the firm ID from the selected firm name
      const selectedFirm = firms.find(f => f.name === form.firm);
      if (!selectedFirm) {
        alert("Invalid firm selected");
        return;
      }

      // Parse the date (assuming DD/MM/YYYY format)
      let completionDate: string;
      try {
        const [day, month, year] = form.date.split('/');
        completionDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } catch {
        alert("Please enter date in DD/MM/YYYY format");
        return;
      }

      if (isEditing && certificateId) {
        // Update existing certificate
        const updateData = {
          title: form.title.trim(),
          certificate_details: form.certificateDetails.trim() || null,
          description: form.description.trim() || null,
          recipient_name: form.recipient.trim(),
          firm_id: selectedFirm.id,
          firm_name: form.firm.trim(),
          issue_date: completionDate,
          signer_name: form.signature.trim() || null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        };

        console.log("Updating certificate:", updateData);

        const { data, error } = await supabase
          .from("certificates")
          .update(updateData)
          .eq("id", certificateId)
          .select()
          .single();

        if (error) {
          console.error("Error updating certificate:", error);
          alert(`Failed to update certificate: ${error.message}`);
          return;
        }

        console.log("Certificate updated successfully:", data);
        
        // Call the onSave callback if provided
        if (onSave) {
          onSave(form);
        } else {
          alert("Certificate updated successfully!");
        }

      } else {
        // Create new certificate
        // Get next certificate number from sequence
        const { data: certNumberData, error: certNumberError } = await supabase
          .rpc('get_next_certificate_number');

        if (certNumberError) {
          console.error("Error getting certificate number:", certNumberError);
          alert("Failed to generate certificate number");
          return;
        }

        // Prepare certificate data
        const certificateData = {
          certificate_number: certNumberData.toString(),
          title: form.title.trim(),
          certificate_details: form.certificateDetails.trim() || null,
          description: form.description.trim() || null,
          recipient_name: form.recipient.trim(),
          firm_id: selectedFirm.id,
          firm_name: form.firm.trim(),
          issue_date: completionDate,
          signer_name: form.signature.trim() || null,
          status: 'issued' as const,
          created_by: user.id,
          updated_by: user.id,
        };

        console.log("Saving certificate:", certificateData);

        const { data, error } = await supabase
          .from("certificates")
          .insert([certificateData])
          .select()
          .single();

        if (error) {
          console.error("Error saving certificate:", error);
          alert(`Failed to save certificate: ${error.message}`);
          return;
        }

        console.log("Certificate saved successfully:", data);
        
        // Call the onSave callback if provided
        if (onSave) {
          onSave(form);
        } else {
          alert("Certificate saved successfully!");
          // Optionally redirect or reset form
          // window.location.href = "/dashboard/certifications";
        }
      }

    } catch (error) {
      console.error("Failed to save certificate:", error);
      alert("An unexpected error occurred while saving the certificate");
    } finally {
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
            <label className="block text-sm text-slate-600 mb-1">Title</label>
            <input name="title" value={form.title} onChange={onChange} placeholder="Certificate Title" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
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
            <label className="block text-sm text-slate-600 mb-1">Recipient</label>
            <input name="recipient" value={form.recipient} onChange={onChange} placeholder="e.g. Jane Doe" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Firm Name</label>
            {userLoading ? (
              <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500">
                Loading user...
              </div>
            ) : loadingFirms ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date</label>
              <input name="date" value={form.date} onChange={onChange} placeholder="DD/MM/YYYY" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
            </div>
            {/* <div>
              <label className="block text-sm text-slate-600 mb-1">Signature</label>
              <input name="signature" value={form.signature} onChange={onChange} placeholder="Signer name" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
            </div> */}
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
