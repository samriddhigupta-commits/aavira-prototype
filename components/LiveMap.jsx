// components/LiveMap.jsx

"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function getVehicleIcon(vehicleType) {
  const emojiMap = { bus: "🚌", "e-rickshaw": "🛺", auto: "🛺" };
  const emoji = emojiMap[vehicleType] || "🚍";
  return L.divIcon({
    html: `<div style="font-size: 28px; transform: translate(-50%, -50%);">${emoji}</div>`,
    className: "",
    iconSize: [30, 30],
  });
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// MAIN COMPONENT
// Props:
// - stops: array of {id, name, lat, lng} — used for search dropdowns, NOT drawn on map
// - routeCoordinates: array of [lat,lng] — full route line, shown only when searching
// - highlightSegment: array of [lat,lng] — highlighted searched segment
// - destination: {lat, lng}
// - vehicles: array of {id, type, lat, lng, speed}
export default function LiveMap({
  stops = [],
  routeCoordinates = [],
  highlightSegment = [],
  destination,
  vehicles = [],
}) {
  const [etaByVehicleId, setEtaByVehicleId] = useState({});

  useEffect(() => {
    if (!vehicles || vehicles.length === 0 || !destination) return;

    const newEtaMap = {};
    vehicles.forEach((vehicle) => {
      const distanceKm = calculateDistanceKm(vehicle.lat, vehicle.lng, destination.lat, destination.lng);
      const speedKmh = vehicle.speed > 5 ? vehicle.speed : 5;
      newEtaMap[vehicle.id] = Math.round((distanceKm / speedKmh) * 60);
    });
    setEtaByVehicleId(newEtaMap);
  }, [vehicles, destination]);

  if (!vehicles || vehicles.length === 0 || !vehicles[0] || vehicles[0].lat === undefined) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-100">
        <p className="text-gray-500">Waiting for vehicle signal...</p>
      </div>
    );
  }

  const mapCenter = [vehicles[0].lat, vehicles[0].lng];

  return (
    <div className="relative w-full h-full">
      <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} className="w-full h-full z-0">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {routeCoordinates.length > 0 && (
          <Polyline positions={routeCoordinates} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.7 }} />
        )}

        {highlightSegment.length > 0 && (
          <Polyline positions={highlightSegment} pathOptions={{ color: "#f97316", weight: 6, opacity: 0.9 }} />
        )}

        {vehicles.map((vehicle) => (
          <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng]} icon={getVehicleIcon(vehicle.type)}>
            <Popup>
              {vehicle.type.toUpperCase()} ({vehicle.id}) — Speed: {vehicle.speed} km/h
              {etaByVehicleId[vehicle.id] !== undefined && <> — ETA: {etaByVehicleId[vehicle.id]} min</>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}