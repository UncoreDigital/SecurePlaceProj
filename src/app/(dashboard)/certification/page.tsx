import { Suspense } from "react";
import CertificationClient from "./CertificationClient";

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

function LoadingSpinner() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 text-lg">Loading Certification...</p>
      </div>
    </div>
  );
}

async function CertificationContent() {
  // Simulate async data loading
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return <CertificationClient />;
}

export default function GiveCertificationPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CertificationContent />
    </Suspense>
  );
}