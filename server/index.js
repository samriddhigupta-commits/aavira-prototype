// server/index.js
//
// BACKEND: simulates vehicles with SMOOTHER, more realistic movement.
// - BUSES: follow a fixed route, but we auto-generate many small
//   intermediate points between the original waypoints, so each
//   update is a small step instead of a big jump.
// - AUTOS/E-RICKSHAWS: wander using a "heading" (direction) that only
//   turns slightly each tick, giving momentum instead of scribbling
//   randomly in a new direction every time.
//
// Run with: node server/index.js

const { WebSocketServer } = require("ws");

// ---------------------------------------------------------------------------
// FUNCTION: densifyRoute(waypoints, pointsPerSegment)
//
// WHAT IT DOES: takes a small list of waypoints (like our original 5-point
// bus route) and inserts extra points BETWEEN each pair, evenly spaced.
// This is called "linear interpolation" — for each segment, we calculate
// intermediate positions a little at a time.
//
// WHY: with only 5 points, each 3-second tick jumps a large real-world
// distance — looks jerky. With, say, 20 extra points per segment, each
// tick only moves a tiny fraction of the way — looks smooth and gradual.
//
// PARAMETERS:
//   waypoints (array) — [{lat, lng}, ...] the original route
//   pointsPerSegment (number) — how many small steps to insert between
//     each pair of original waypoints
//
// RETURNS: a new, much longer array of {lat, lng} points
// ---------------------------------------------------------------------------
function densifyRoute(waypoints, pointsPerSegment = 15) {
  const denseRoute = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    for (let step = 0; step < pointsPerSegment; step++) {
      // `t` goes from 0 to just-under-1 across this segment — it's the
      // "how far along this segment are we" fraction.
      const t = step / pointsPerSegment;

      denseRoute.push({
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t,
      });
    }
  }

  // Add the very last waypoint too (the loop above stops just before it).
  denseRoute.push(waypoints[waypoints.length - 1]);

  return denseRoute;
}

// Original, sparse waypoints (kept small and readable) — these get
// "densified" below into smooth, gradual paths automatically.
const busRoute1Waypoints = [
  { lat: 26.4499, lng: 80.3319 },
  { lat: 26.4520, lng: 80.3350 },
  { lat: 26.4550, lng: 80.3400 },
  { lat: 26.4575, lng: 80.3435 },
  { lat: 26.4600, lng: 80.3470 },
];

const busRoute2Waypoints = [
  { lat: 26.4499, lng: 80.3319 },
  { lat: 26.4540, lng: 80.3300 },
  { lat: 26.4580, lng: 80.3360 },
  { lat: 26.4610, lng: 80.3420 },
  { lat: 26.4600, lng: 80.3470 },
];

const busRoute3Waypoints = [
  { lat: 26.4100, lng: 80.3050 },
  { lat: 26.4075, lng: 80.3100 },
  { lat: 26.4050, lng: 80.3150 },
  { lat: 26.4025, lng: 80.3200 },
  { lat: 26.4000, lng: 80.3250 },
];

// The ACTUAL routes each bus drives — densified into smooth paths.
const busRoute1 = densifyRoute(busRoute1Waypoints);
const busRoute2 = densifyRoute(busRoute2Waypoints);
const busRoute3 = densifyRoute(busRoute3Waypoints);

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
  { id: "bus-03", type: "bus", kind: "fixed", route: busRoute3, currentIndex: 0 },
  // NEW: each random vehicle now has a `headingLat`/`headingLng` — a
  // small "velocity" that persists between ticks, instead of picking
  // a brand new random direction every single time.
  { id: "auto-01", type: "e-rickshaw", kind: "random", lat: 26.4550, lng: 80.3400, headingLat: 0, headingLng: 0 },
  { id: "auto-02", type: "auto", kind: "random", lat: 26.4520, lng: 80.3360, headingLat: 0, headingLng: 0 },
  { id: "auto-03", type: "e-rickshaw", kind: "random", lat: 26.4580, lng: 80.3440, headingLat: 0, headingLng: 0 },
  { id: "auto-04", type: "e-rickshaw", kind: "random", lat: 26.4495, lng: 80.3420, headingLat: 0, headingLng: 0 },
];

const PORT = process.env.PORT || 4000;
const wss = new WebSocketServer({ port: PORT });
console.log(`✅ WebSocket server running on port ${PORT}`);

function broadcastToAllClients(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(message);
  });
}

function stepFixedVehicle(vehicle) {
  const point = vehicle.route[vehicle.currentIndex];
  vehicle.currentIndex = (vehicle.currentIndex + 1) % vehicle.route.length;
  return { lat: point.lat, lng: point.lng };
}

// ---------------------------------------------------------------------------
// FUNCTION: stepRandomVehicle(vehicle)
//
// WHAT IT DOES: moves a "random"-kind vehicle using MOMENTUM instead of
// a fresh random direction every tick.
//
// HOW: each vehicle keeps a small `headingLat`/`headingLng` — think of
// it as "which way am I currently drifting." Each tick, we nudge that
// heading SLIGHTLY (a small random adjustment), rather than replacing
// it outright. This means direction changes gradually, like a real
// vehicle turning, instead of teleporting to a random new direction
// every 3 seconds.
// ---------------------------------------------------------------------------
function stepRandomVehicle(vehicle) {
  // Small random ADJUSTMENT to the existing heading (not a full reset).
  const headingAdjustLat = (Math.random() - 0.5) * 0.0006;
  const headingAdjustLng = (Math.random() - 0.5) * 0.0006;

  vehicle.headingLat += headingAdjustLat;
  vehicle.headingLng += headingAdjustLng;

  // Clamp the heading itself so speed doesn't runaway over time.
  vehicle.headingLat = clamp(vehicle.headingLat, -0.0015, 0.0015);
  vehicle.headingLng = clamp(vehicle.headingLng, -0.0015, 0.0015);

  const newLat = clamp(vehicle.lat + vehicle.headingLat, wanderBounds.minLat, wanderBounds.maxLat);
  const newLng = clamp(vehicle.lng + vehicle.headingLng, wanderBounds.minLng, wanderBounds.maxLng);

  // If we hit a boundary wall, reverse the heading on that axis — like
  // bouncing off an edge — instead of getting stuck pressed against it.
  if (newLat === wanderBounds.minLat || newLat === wanderBounds.maxLat) {
    vehicle.headingLat *= -1;
  }
  if (newLng === wanderBounds.minLng || newLng === wanderBounds.maxLng) {
    vehicle.headingLng *= -1;
  }

  vehicle.lat = newLat;
  vehicle.lng = newLng;

  return { lat: newLat, lng: newLng };
}

function moveAllVehiclesAndBroadcast() {
  const vehicleUpdates = vehicles.map((vehicle) => {
    const newPosition = vehicle.kind === "fixed" ? stepFixedVehicle(vehicle) : stepRandomVehicle(vehicle);
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

// CHANGED: tick interval reduced from 3000ms to 1500ms. Combined with
// the densified bus routes and smaller per-tick auto movement, this
// makes motion look continuous rather than a jump-cut every 3 seconds.
setInterval(moveAllVehiclesAndBroadcast, 1500);

wss.on("connection", (client) => {
  console.log("🔌 A browser connected!");
  client.on("close", () => console.log("❌ A browser disconnected."));
});