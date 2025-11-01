import { Eye, MapPin, SlidersHorizontal } from "lucide-react";
import { Suspense } from "react";
import EmergenciesClient from "./EmergenciesClient";

const data = [
    {
        code: "WB2154",
        name: "John Deo",
        number: "+31 123456789",
        email: "Johndeo@yopmail.com",
        date: "03/06/2025",
        time: "09:45 AM",
    },
    {
        code: "CF4512",
        name: "John Deo",
        number: "+31 123456789",
        email: "Johndeo@yopmail.com",
        date: "03/06/2025",
        time: "09:45 AM",
    },
    {
        code: "EB452",
        name: "John Deo",
        number: "+31 123456789",
        email: "Johndeo@yopmail.com",
        date: "03/06/2025",
        time: "09:45 AM",
    },
    {
        code: "PC4795",
        name: "John Deo",
        number: "+31 123456789",
        email: "Johndeo@yopmail.com",
        date: "03/06/2025",
        time: "09:45 AM",
    },
    {
        code: "EB6548",
        name: "John Deo",
        number: "+31 123456789",
        email: "Johndeo@yopmail.com",
        date: "03/06/2025",
        time: "09:45 AM",
    },
    {
        code: "EB021",
        name: "John Deo",
        number: "+31 123456789",
        email: "Johndeo@yopmail.com",
        date: "03/06/2025",
        time: "09:45 AM",
    },
    {
        code: "PC0215",
        name: "John Deo",
        number: "+31 123456789",
        email: "Johndeo@yopmail.com",
        date: "03/06/2025",
        time: "09:45 AM",
    },
    {
        code: "PC7552",
        name: "John Deo",
        number: "+31 123456789",
        email: "Johndeo@yopmail.com",
        date: "03/06/2025",
        time: "09:45 AM",
    },
];

const DRILL_LOCATION = "Laan van Wateringse Veld 1322 2548 CX The Hague";
const MAP_IMAGE_URL =
  "https://maps.googleapis.com/maps/api/staticmap?center=Laan+van+Wateringse+Veld+1322+2548+CX+The+Hague&zoom=15&size=350x150&markers=color:red%7C52.0367,4.3007&key=YOUR_GOOGLE_MAPS_API_KEY";

function EmergencyDetailModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: any }) {
    if (!open || !data) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/70">
            <div className="bg-white rounded-xl shadow-lg p-6 w-[400px]">
                <div className="font-bold text-lg mb-2 text-[#3E2FB7] font-bold">{data.volunteer}</div>
                <div className="flex justify-between text-sm mb-2">
                    <div>
                        <span className="font-semibold">Drill Date :</span>{" "}
                        <span className="text-[#3E2FB7] font-bold">{data.date}</span>
                    </div>
                    <div>
                        <span className="font-semibold">Drill Time :</span>{" "}
                        <span className="text-[#3E2FB7] font-bold">{data.time}</span>
                    </div>
                </div>
                <div className="flex items-center text-gray-700 text-sm mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    {DRILL_LOCATION}
                </div>
                <img
                    src={MAP_IMAGE_URL}
                    alt="Map"
                    className="rounded mb-2 border"
                    width={350}
                    height={150}
                />
                <hr className="my-2" />
                <div className="text-sm">
                    <span className="font-semibold">Alert Accepted by :</span>{" "}
                    <span className="text-[#3E2FB7] font-bold">{data.name}</span>
                </div>
                <div className="text-sm">
                    <span className="font-semibold">Resolution :</span>{" "}
                    <span className="text-[#3E2FB7] font-bold">{data.name}</span>
                </div>
                <div className="flex justify-end mt-4">
                    <button
                        className="px-4 py-1 rounded bg-brand-orange text-white font-medium"
                        onClick={onClose}
                    >
                        Close
                    </button>
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
        <p className="mt-4 text-gray-600 text-lg">Loading Emergencies...</p>
      </div>
    </div>
  );
}

async function EmergenciesContent() {
  // Simulate async data loading
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return <EmergenciesClient data={data} />;
}

export default function EmergencyAlertLogPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EmergenciesContent />
    </Suspense>
  );
}