"use client";

import { useRouter } from "next/navigation";
import CertificateCreator from "../../components/CertificateCreator";

export default function NewCertificationPage() {
  const router = useRouter();

  const handleSave = (data: {
    title: string;
    recipient: string;
    firm?: string;
    date?: string;
    signature?: string;
  }) => {
    try {
    } catch (e) {
      console.error("Failed to save certificate:", e);
    }
  };

  return (
    <div className="space-y-4">
      <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2 print:hidden">
        <span>Home</span>
        <span>&gt;</span>
        <span>Certifications</span>
        <span>&gt;</span>
        <span>New</span>
      </nav>
      <h1 className="text-2xl font-bold mb-1 print:hidden">Create Certificate</h1>
      <CertificateCreator onSave={handleSave} />
    </div>
  );
}
