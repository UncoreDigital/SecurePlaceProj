"use client";
import { Eye, MapPin, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

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

export default function EmergenciesClient({ data }: { data: any[] }) {
    const [selected, setSelected] = useState<any>(null);
    
    return (
        <div>
            <nav className="text-gray-500 text-sm mb-2 flex items-center gap-2">
                <span>Home</span>
                <span>&gt;</span>
                <span>Emergency Alert Log</span>
            </nav>
            <h1 className="text-2xl font-bold mb-1 cursor-pointer">Emergency Alert Log</h1>
            <div className="text-gray-500 mb-4">1110 Brown St..</div>
            <div className="bg-white rounded-xl shadow p-4">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-2">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 text-sm">
                                <th className="px-4 py-2 text-left font-semibold">Code</th>
                                <th className="px-4 py-2 text-left font-semibold">Employee Name</th>
                                <th className="px-4 py-2 text-left font-semibold">Employee Number</th>
                                <th className="px-4 py-2 text-left font-semibold">Email Id</th>
                                <th className="px-4 py-2 text-left font-semibold">Emergency Date</th>
                                <th className="px-4 py-2 text-left font-semibold">Emergency Time</th>
                                <th className="px-4 py-2 text-center">
                                    <SlidersHorizontal className="inline w-5 h-5 text-gray-400" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <tr
                                    key={row.code}
                                    className="bg-white border-b hover:bg-gray-50 text-gray-700"
                                >
                                    <td className="px-4 py-2">{row.code}</td>
                                    <td className="px-4 py-2">{row.name}</td>
                                    <td className="px-4 py-2">{row.number}</td>
                                    <td className="px-4 py-2">{row.email}</td>
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
            <EmergencyDetailModal
                open={!!selected}
                onClose={() => setSelected(null)}
                data={selected}
            />
        </div>
    );
}