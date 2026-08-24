// server/index.js
//
// BACKEND: simulates multiple vehicles.
// - 2 BUSES, each following its own FIXED route (looping forever).
// - 4 AUTOS/E-RICKSHAWS, each moving RANDOMLY within a bounded area.
//
// Run with: node server/index.js

const { WebSocketServer } = require("ws");

const busRoute1 = [
  { lat: 26.4499, lng: 80.3319 },
  { lat: 26.4520, lng: 80.3350 },
  { lat: 26.4550, lng: 80.3400 },
  { lat: 26.4575, lng: 80.3435 },
  { lat: 26.4600, lng: 80.3470 },
];

const busRoute2 = [
  { lat: 26.4499, lng: 80.3319 },
  { lat: 26.4540, lng: 80.3300 },
  { lat: 26.4580, lng: 80.3360 },
  { lat: 26.4610, lng: 80.3420 },
  { lat: 26.4600, lng: 80.3470 },
];

const wanderBounds = {
  minLat: 26.4470,
  maxLat: 26.4630,
  minLng: 80.3290,
  maxLng: 80.3500,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

let vehicles = [
  { id: "bus-01", type: "bus", kind: "fixed", route: busRoute1, currentIndex: 0 },
  { id: "bus-02", type: "bus", kind: "fixed", route: busRoute2, currentIndex: 0 },
  { id: "auto-01", type: "e-rickshaw", kind: "random", lat: 26.4550, lng: 80.3400 },
  { id: "auto-02", type: "auto", kind: "random", lat: 26.4520, lng: 80.3360 },
  { id: "auto-03", type: "e-rickshaw", kind: "random", lat: 26.4580, lng: 80.3440 },
  { id: "auto-04", type: "e-rickshaw", kind: "random", lat: 26.4495, lng: 80.3420 },
];

const wss = new WebSocketServer({ port: 4000 });
console.log("✅ WebSocket server running on ws://localhost:4000");

function broadcastToAllClients(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function stepFixedVehicle(vehicle) {
  const point = vehicle.route[vehicle.currentIndex];
  vehicle.currentIndex = (vehicle.currentIndex + 1) % vehicle.route.length;
  return { lat: point.lat, lng: point.lng };
}

function stepRandomVehicle(vehicle) {
  const latStep = (Math.random() - 0.5) * 0.003;
  const lngStep = (Math.random() - 0.5) * 0.003;
  const newLat = clamp(vehicle.lat + latStep, wanderBounds.minLat, wanderBounds.maxLat);
  const newLng = clamp(vehicle.lng + lngStep, wanderBounds.minLng, wanderBounds.maxLng);
  vehicle.lat = newLat;
  vehicle.lng = newLng;
  return { lat: newLat, lng: newLng };
}

function moveAllVehiclesAndBroadcast() {
  const vehicleUpdates = vehicles.map((vehicle) => {
    const newPosition =
      vehicle.kind === "fixed" ? stepFixedVehicle(vehicle) : stepRandomVehicle(vehicle);

    return {
      id: vehicle.id,
      type: vehicle.type,
      lat: newPosition.lat,
      lng: newPosition.lng,
      speed: Math.floor(Math.random() * 10) + 18,
      timestamp: Date.now(),
    };
  });

  broadcastToAllClients(vehicleUpdates);
  console.log("📍 Sent updates for", vehicleUpdates.length, "vehicles");
}

setInterval(moveAllVehiclesAndBroadcast, 3000);

wss.on("connection", (client) => {
  console.log("🔌 A browser connected!");
  client.on("close", () => {
    console.log("❌ A browser disconnected.");
  });
});