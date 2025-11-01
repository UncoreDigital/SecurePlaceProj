import { Eye, SlidersHorizontal, MapPin } from "lucide-react";
import { Suspense } from "react";
import DrillsClient from "./DrillsClient";

const data = [
   {
    purpose: "Fire Drill",
    location: "Waterings",
    volunteer: "John Deo",
    date: "03/06/2025",
    time: "09:45 AM",
  },
  {
    purpose: "Earthquake Drill",
    location: "Waterings",
    volunteer: "John Deo",
    date: "03/06/2025",
    time: "09:45 AM",
  },
  {
    purpose: "Lockdown Drill",
    location: "Waterings",
    volunteer: "John Deo",
    date: "03/06/2025",
    time: "09:45 AM",
  },
  {
    purpose: "Evacuation Drill",
    location: "Waterings",
    volunteer: "John Deo",
    date: "03/06/2025",
    time: "09:45 AM",
  },
  {
    purpose: "Shelter-in-Place Drill",
    location: "Waterings",
    volunteer: "John Deo",
    date: "03/06/2025",
    time: "09:45 AM",
  },
  {
    purpose: "Medical Emergency Drill",
    location: "Waterings",
    volunteer: "John Deo",
    date: "03/06/2025",
    time: "09:45 AM",
  },
  {
    purpose: "Flood Drill",
    location: "Waterings",
    volunteer: "John Deo",
    date: "03/06/2025",
    time: "09:45 AM",
  },
  {
    purpose: "Bomb Threat Drill",
    location: "Waterings",
    volunteer: "John Deo",
    date: "03/06/2025",
    time: "09:45 AM",
  },
];

const DRILL_LOCATION = "Laan van Wateringse Veld 1322 2548 CX The Hague";
const MAP_IMAGE_URL =
  "https://maps.googleapis.com/maps/api/staticmap?center=Laan+van+Wateringse+Veld+1322+2548+CX+The+Hague&zoom=15&size=350x150&markers=color:red%7C52.0367,4.3007&key=YOUR_GOOGLE_MAPS_API_KEY";

function DrillDetailModal({ open, onClose, drill }: { open: boolean; onClose: () => void; drill: any }) {
  if (!open || !drill) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/70">
      <div className="bg-white rounded-xl shadow-lg p-6 w-[400px]">
        <div className="font-bold text-lg mb-2">{drill.volunteer}</div>
        <div className="flex justify-between text-sm mb-2">
          <div>
            <span className="font-semibold">Drill Date :</span>{" "}
            <span className="text-[#3E2FB7] font-bold">{drill.date}</span>
          </div>
          <div>
            <span className="font-semibold">Drill Time :</span>{" "}
            <span className="text-[#3E2FB7] font-bold">{drill.time}</span>
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
          <span className="font-semibold">Drill Purpose :</span>{" "}
          <span className="text-[#3E2FB7] font-bold">{drill.purpose}</span>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-1 rounded bg-brand-orange text-white font-medium cursor-pointer"
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
        <p className="mt-4 text-gray-600 text-lg">Loading Drills...</p>
      </div>
    </div>
  );
}

async function DrillsContent() {
  // Simulate async data loading
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return <DrillsClient data={data} />;
}

export default function DrillAlertLogPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DrillsContent />
    </Suspense>
  );
}