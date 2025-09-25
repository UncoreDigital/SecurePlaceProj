"use client";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2 } from "lucide-react";

const scheduledClasses = [
  {
    id: "1",
    title: "Workplace Safety Training: Proactive Steps for Preventing ...",
    date: "17 Aug, 2025",
    time: "09:00 PM to 10:00 PM",
    status: "approved",
    type: "In-Person",
    thumbnailUrl: "/images/safety-class-demo.png",
  },
  {
    id: "2",
    title: "Workplace Safety Training: Proactive Steps for Preventing ...",
    date: "17 Aug, 2025",
    time: "09:00 PM to 10:00 PM",
    status: "pending",
    type: "In-Person",
    thumbnailUrl: "/images/safety-class-demo.png",
  },
  {
    id: "3",
    title: "Workplace Safety Training: Proactive Steps for Preventing ...",
    date: "17 Aug, 2025",
    time: "09:00 PM to 10:00 PM",
    status: "approved",
    type: "In-Person",
    thumbnailUrl: "/images/safety-class-demo.png",
  },
];

const statusBtnStyles: Record<string, string> = {
  approved: "bg-emerald-500 text-white hover:bg-emerald-600",
  pending: "bg-yellow-400 text-white hover:bg-yellow-500",
};

function CancelModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/70">
      <div className="bg-white rounded-xl p-10 flex flex-col items-center shadow-lg min-w-[350px]">
        <Trash2 className="w-16 h-16 text-brand-orange mb-4" />
        <div className="text-lg font-medium mb-6 text-center">
          Are you sure cancel this classes
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="min-w-[70px]" onClick={onClose}>
            No
          </Button>
          <Button className="bg-brand-orange min-w-[70px]" onClick={onConfirm}>
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledClassesPage() {
  const [cancelId, setCancelId] = useState<string | null>(null);

  const handleCancel = (id: string) => setCancelId(id);
  const handleClose = () => setCancelId(null);
  const handleConfirm = () => {
    // Add your cancel logic here (API call, state update, etc.)
    setCancelId(null);
  };

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2">Home &gt; Scheduled Classes</nav>
      <h1 className="text-3xl font-bold text-brand-blue mb-6">Scheduled Classes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scheduledClasses.map((cls) => (
          <div
            key={cls.id}
            className="bg-white rounded-xl shadow p-4 flex flex-col gap-3"
          >
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-2 h-40">
              <Image
                src={cls.thumbnailUrl}
                alt={cls.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <span className="absolute top-3 right-3 bg-brand-orange text-white text-xs px-3 py-1 rounded font-medium">
                {cls.type}
              </span>
            </div>
            <div className="font-semibold text-lg mb-1 line-clamp-2">{cls.title}</div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              <span>{cls.date}</span>
              <span className="mx-2">|</span>
              <span>{cls.time}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                className={`flex-1 ${statusBtnStyles[cls.status]}`}
                disabled={cls.status !== "approved" && cls.status !== "pending"}
              >
                {cls.status === "approved"
                  ? "Approved"
                  : cls.status === "pending"
                  ? "Pending"
                  : ""}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700"
                onClick={() => handleCancel(cls.id)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </div>
      <CancelModal
        open={!!cancelId}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </div>
  );
}