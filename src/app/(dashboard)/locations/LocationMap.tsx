"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import "@/lib/leaflet-fix";

interface LocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  name: string;
}

const LocationMap = ({ latitude, longitude, name }: LocationMapProps) => {
  const hasValidCoordinates =
    typeof latitude === "number" &&
    !Number.isNaN(latitude) &&
    typeof longitude === "number" &&
    !Number.isNaN(longitude);

  if (!hasValidCoordinates) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
        Coordinates unavailable
      </div>
    );
  }

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", zIndex: 1 }}
    >
      <TileLayer
        // attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
};

export default LocationMap;
