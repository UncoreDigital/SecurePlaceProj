"use client";

import { useRouter } from "next/navigation";
import CertificateCreator from "../../components/CertificateCreator";
import { useEffect } from "react";

const STORAGE_LIST_KEY = "secure_place_certs";
const DRAFT_KEY = "secure_place_cert_draft";

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
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item = { id, ...data };
      const raw = localStorage.getItem(STORAGE_LIST_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const updated = [item, ...list];
      localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(updated));
      // Clear draft
      localStorage.removeItem(DRAFT_KEY);
      // Navigate back to listing
      router.push("/certifications");
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
