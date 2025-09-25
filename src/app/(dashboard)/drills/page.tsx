"use client";
import { useState } from "react";
import { Eye, SlidersHorizontal, MapPin } from "lucide-react";

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

export default function DrillAlertLogPage() {
  const [selected, setSelected] = useState<any>(null);

  return (
    <div>
      <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2">
        <span>Home</span>
        <span>&gt;</span>
        <span>Drill Alert Log</span>
      </nav>
      <h1 className="text-2xl font-bold mb-1">Drill Alert Log</h1>
      <div className="bg-white rounded-xl shadow p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm">
                <th className="px-4 py-2 text-left font-semibold">Drill Purpose</th>
                <th className="px-4 py-2 text-left font-semibold">Location</th>
                <th className="px-4 py-2 text-left font-semibold">Volunteer Name</th>
                <th className="px-4 py-2 text-left font-semibold">Drill Date</th>
                <th className="px-4 py-2 text-left font-semibold">Drill Time</th>
                <th className="px-4 py-2 text-center">
                  <SlidersHorizontal className="inline w-5 h-5 text-gray-400" />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row.purpose + idx}
                  className="bg-white border-b hover:bg-gray-50 text-gray-700"
                >
                  <td className="px-4 py-2">{row.purpose}</td>
                  <td className="px-4 py-2">{row.location}</td>
                  <td className="px-4 py-2">{row.volunteer}</td>
                  <td className="px-4 py-2">{row.date}</td>
                  <td className="px-4 py-2">{row.time}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      className="p-1 rounded hover:bg-gray-100"
                      onClick={() => setSelected(row)}
                    >
                      <Eye className="w-5 h-5 text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination and controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Showing</span>
            <select className="border rounded px-2 py-1">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <span>of 500</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded px-3 py-1 text-gray-700 text-sm">Reset Filters</button>
            <button className="border rounded px-2 py-1 text-gray-400" disabled>
              &lt;&lt;
            </button>
            <button className="border rounded px-2 py-1 text-gray-400" disabled>
              &lt;
            </button>
            <span className="text-gray-700 text-sm">1</span>
            <span className="text-gray-500 text-sm">of 25 pages</span>
            <button className="border rounded px-2 py-1 text-gray-700">
              &gt;
            </button>
            <button className="border rounded px-2 py-1 text-gray-700">
              &gt;&gt;
            </button>
          </div>
        </div>
      </div>
      <DrillDetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        drill={selected}
      />
    </div>
  );
}