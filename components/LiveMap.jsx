// components/LiveMap.jsx

"use client";

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
  const emojiMap = { bus: "🚌", "e-rickshaw": "🛺", auto: "🚕" };
  const emoji = emojiMap[vehicleType] || "🚐";
  return L.divIcon({
    html: `<div style="font-size: 28px; transform: translate(-50%, -50%);">${emoji}</div>`,
    className: "",
    iconSize: [30, 30],
  });
}

// -----------------------------------------------------------------------
// MAIN COMPONENT
//
// PROPS:
//   vehicles (array) — {id, type, lat, lng, speed}
//   routeSegments (array) — {coords: [[lat,lng], ...], color: "#hex", dashed: bool}
//     Each segment is its own colored line. `dashed: true` is used for
//     "suggested" auto paths (no fixed route), vs solid lines for real
//     bus routes.
// -----------------------------------------------------------------------
export default function LiveMap({ vehicles = [], routeSegments = [] }) {
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
      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} className="w-full h-full z-0">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {routeSegments.map((segment, index) => (
          <Polyline
            key={index}
            positions={segment.coords}
            pathOptions={{
              color: segment.color,
              weight: 5,
              opacity: 0.85,
              dashArray: segment.dashed ? "10, 10" : null,
            }}
          />
        ))}

        {vehicles.map((vehicle) => (
          <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng]} icon={getVehicleIcon(vehicle.type)}>
            <Popup>
              {vehicle.type.toUpperCase()} ({vehicle.id}) — {vehicle.speed} km/h
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}