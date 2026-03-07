"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/hooks/useUser";

type CertificateData = {
  recipient: string;
  title: string;
  firm: string;
  date: string;
  signature: string;
};

interface Firm {
  id: string;
  name: string;
}

function CertificatePreview({ data }: { data: CertificateData }) {
  return (
    <div
      id="certificate-print"
      className="w-full aspect-[1.414/1] relative overflow-hidden print:shadow-none"
      style={{
        backgroundImage: 'url(/images/certificate-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Recipient Name positioned where "Company Name" appears on the image */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-13%', marginLeft: '-30%' }}>
        <span className="text-2xl md:text-2xl font-bold text-[#ff6b35]">
          {data.recipient || "{Recipient Name}"}
        </span>
      </div>
      
      {/* Signature positioned at the signature line on the image */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '23%', marginLeft: '2%' }}>
        <span className="text-sm md:text-sm font-semibold text-[#1e3a5f]">
          {data.signature || "{Signature}"}
        </span>
      </div>
      
      {/* Date positioned at the date placeholder on the image */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '23%', marginLeft: '-58%' }}>
        <span className="text-sm md:text-sm font-semibold text-[#1e3a5f]">
          {data.date || "{DD/MM/YYYY}"}
        </span>
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
    title: initial?.title ?? "Certificate of Completion",
    firm: initial?.firm ?? "",
    date: initial?.date ?? "",
    signature: initial?.signature ?? "",
  });

  // Fetch firms data
  useEffect(() => {
    console.log('CertificateCreator useEffect - user:', user, 'userLoading:', userLoading, 'isEditing:', isEditing);
    
    const fetchFirms = async () => {
      try {
        setLoadingFirms(true);
        console.log('Fetching firms...');
        
        let query = supabase
          .from("firms")
          .select("id, name")
          .order("name", { ascending: true });

        // If user is firm_admin, only show their firm
        if (user?.role === "firm_admin" && user?.firmId) {
          console.log('Filtering firms for firm_admin, firmId:', user.firmId);
          query = query.eq("id", user.firmId);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching firms:", error);
          setFirms([]);
          return;
        }

        console.log('Fetched firms:', data);
        setFirms(data || []);
        
        // Auto-select firm if user is firm_admin and no initial firm is set
        if (user?.role === "firm_admin" && data && data.length === 1 && !initial?.firm) {
          console.log('Auto-selecting firm for firm_admin:', data[0].name);
          setForm(prev => ({ ...prev, firm: data[0].name }));
        }
      } catch (error) {
        console.error("Failed to fetch firms:", error);
        setFirms([]);
      } finally {
        setLoadingFirms(false);
      }
    };

    if (!userLoading && user) {
      console.log('User is ready, fetching firms. User role:', user.role, 'User firmId:', user.firmId);
      fetchFirms();
    } else if (!userLoading && !user) {
      console.log('No user found, but still fetching all firms for super admin access');
      // Still fetch firms even if no user (might be a super admin case)
      fetchFirms();
    } else {
      console.log('User not ready yet. userLoading:', userLoading, 'user:', !!user);
    }
  }, [user, userLoading, isEditing]); // Removed initial?.firm from dependencies

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const handleDownload = async () => {
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
        const fileName = form.recipient ? form.recipient.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'certificate';
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
            <label className="block text-sm text-slate-600 mb-1">Recipient</label>
            <input name="recipient" value={form.recipient} onChange={onChange} placeholder="e.g. Jane Doe" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Firm Name</label>
            {loadingFirms ? (
              <div className="w-full border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500">
                Loading firms...
              </div>
            ) : (
              <select 
                name="firm" 
                value={form.firm} 
                onChange={onChange} 
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40 bg-white"
              >
                <option value="">Select a firm...</option>
                {firms.map((firm) => {
                  console.log('Rendering firm option:', firm);
                  return (
                    <option key={firm.id} value={firm.name}>
                      {firm.name}
                    </option>
                  );
                })}
              </select>
            )}
            
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date</label>
              <input name="date" value={form.date} onChange={onChange} placeholder="DD/MM/YYYY" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Signature</label>
              <input name="signature" value={form.signature} onChange={onChange} placeholder="Signer name" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40" />
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            {showSave && (
              <button 
                type="button" 
                onClick={handleSave} 
                disabled={saving || !user}
                className="px-4 py-2 rounded bg-brand-blue text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? "Saving..." : (isEditing ? "Update" : "Save")}
              </button>
            )}
            {showPrint && (
              <button type="button" onClick={handleDownload} className="px-4 py-2 rounded bg-brand-orange text-white text-sm font-medium hover:bg-orange-600 cursor-pointer">Print</button>
            )}
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
