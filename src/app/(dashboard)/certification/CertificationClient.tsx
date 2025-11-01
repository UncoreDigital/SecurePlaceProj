"use client";

import { useEffect, useState } from "react";

type CertificateData = {
  recipient: string;
  title: string;
  firm: string;
  date: string;
  signature: string;
};

function CertificatePreview({ data }: { data: CertificateData }) {
  return (
    <div className="w-full bg-white rounded-xl shadow relative overflow-hidden print:shadow-none">
      {/* Decorative border */}
      <div className="m-4 border-[3px] border-slate-200 rounded-lg">
        <div className="m-6 p-8 md:p-12 border border-slate-300 rounded-lg text-center">
          <p className="uppercase tracking-widest text-xs text-slate-500 mb-2">
            Certificate of Appreciation
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-brand-blue mb-3">
            {data.title || "Title of Certification"}
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            This certificate is proudly presented to
          </p>
          <div className="mt-4 mb-6">
            <span className="inline-block text-2xl md:text-3xl font-semibold text-brand-orange">
              {data.recipient || "{Recipient Name}"}
            </span>
          </div>

          {/* Fixed appreciation lines */}
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
            In appreciation of outstanding participation and successful
            completion of the safety training program.
          </p>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed mt-2">
            Awarded by {data.firm || "{Firm Name}"} for dedication to safety
            excellence and continuous improvement.
          </p>

          {/* Footer section with signature and date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-slate-400" />
              <span className="mt-2 text-sm text-slate-500">Signature</span>
              <span className="mt-1 text-slate-700">
                {data.signature || "{Signature}"}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-slate-400" />
              <span className="mt-2 text-sm text-slate-500">Date</span>
              <span className="mt-1 text-slate-700">{data.date || "DD/MM/YYYY"}</span>
            </div>
          </div>

          {/* Firm name footer */}
          <div className="mt-10 text-slate-500 text-sm">
            {data.firm || "{Firm Name}"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CertificationClient() {
  const [form, setForm] = useState<CertificateData>({
    recipient: "",
    title: "Certificate of Completion",
    firm: "",
    date: "",
    signature: "",
  });

  const STORAGE_KEY = "secure_place_cert_draft";

  // Load draft on mount
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm((prev: CertificateData) => ({ ...prev, ...parsed }));
      }
    } catch (_) {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch (_) {
      /* ignore */
    }
  }, [form]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f: CertificateData) => ({ ...f, [name]: value }));
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="space-y-4">
      {/* Print-only CSS: show only the certificate area when printing */}
      <style jsx global>{`
        @media print {
          /* Hide everything by default */
          body * { visibility: hidden !important; }
          /* Only show the certificate area */
          #certificate-print, #certificate-print * { visibility: visible !important; }
          /* Position the certificate at the top-left for printing */
          #certificate-print { position: absolute !important; inset: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; background: white !important; }
        }
        @page { size: A4; margin: 16mm; }
      `}</style>
      {/* Breadcrumb */}
      <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2 print:hidden">
        <span>Home</span>
        <span>&gt;</span>
        <span>Give Certification</span>
      </nav>

      <h1 className="text-2xl font-bold mb-1 print:hidden">Give Certification</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <section className="lg:col-span-4 bg-white rounded-xl shadow p-4 print:hidden">
          <h2 className="font-semibold text-slate-800 mb-3">Certificate Details</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Title</label>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="Certificate Title"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Recipient</label>
              <input
                name="recipient"
                value={form.recipient}
                onChange={onChange}
                placeholder="e.g. Jane Doe"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Firm Name</label>
              <input
                name="firm"
                value={form.firm}
                onChange={onChange}
                placeholder="e.g. Acme Inc."
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Date</label>
                <input
                  name="date"
                  value={form.date}
                  onChange={onChange}
                  placeholder="DD/MM/YYYY"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Signature</label>
                <input
                  name="signature"
                  value={form.signature}
                  onChange={onChange}
                  placeholder="Signer name"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              {/* Optional: Reset draft */}
              <button
                type="button"
                onClick={() => {
                  const empty: CertificateData = { recipient: "", title: "Certificate of Completion", firm: "", date: "", signature: "" };
                  setForm(empty);
                  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(empty)); } catch (_) {}
                }}
                className="px-4 py-2 rounded border text-slate-700 text-sm hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded bg-brand-orange text-white text-sm font-medium hover:bg-orange-600"
              >
                Print Certificate
              </button>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section id="certificate-print" className="lg:col-span-8 bg-slate-50 rounded-xl p-4 print:bg-white print:col-span-12">
          <CertificatePreview data={form} />
        </section>
      </div>
    </div>
  );
}