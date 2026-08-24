// lib/geoUtils.js
//
// Shared geography helper functions.

export function calculateDistanceKm(lat1, lng1, lat2, lng2) {
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

export async function fetchRoadRoute(fromPoint, toPoint) {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromPoint.lng},${fromPoint.lat};${toPoint.lng},${toPoint.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distanceKm = route.distance / 1000;

    return { coords, distanceKm };
  } catch (error) {
    console.error("OSRM routing failed, will fall back to a straight line:", error);
    return null;
  }
}

// -----------------------------------------------------------------------
// FUNCTION: hashVehicleId(vehicleId)
//
// WHAT IT DOES: turns a vehicle's ID string (like "auto-03") into a
// small, CONSISTENT number between 0 and 1 — the same ID always
// produces the same number, every time the app runs.
//
// WHY WE NEED THIS: we want each vehicle to have its own fare rate
// (like real drivers/operators charging slightly different amounts),
// but we want that rate to stay STABLE for a given vehicle — not
// change randomly every time we recalculate. Hashing the ID gives us
// "randomness" that's actually deterministic per vehicle.
//
// HOW: we add up the character codes of every letter in the ID, then
// use modulo (%) to keep the result in a small, predictable range.
// -----------------------------------------------------------------------
function hashVehicleId(vehicleId) {
  let total = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    total += vehicleId.charCodeAt(i); // charCodeAt gives each letter a number
  }
  // (total % 100) / 100 gives us a number between 0 and 0.99.
  return (total % 100) / 100;
}

// -----------------------------------------------------------------------
// FUNCTION: estimateCost(vehicleType, distanceKm, vehicleId)
//
// Base fare + per-km rate, same as before, BUT now also applies a
// per-VEHICLE multiplier (roughly ±20%) so two autos covering the same
// distance charge genuinely different fares — like real drivers do.
//
// PARAMETERS:
//   vehicleType (string) — "bus", "auto", or "e-rickshaw"
//   distanceKm (number)
//   vehicleId (string, optional) — if provided, applies per-vehicle
//     price variation. If omitted, falls back to a flat estimate
//     (useful for a general "roughly how much would this cost" query
//     before a specific vehicle is chosen).
// -----------------------------------------------------------------------
export function estimateCost(vehicleType, distanceKm, vehicleId = null) {
  const baseFare = vehicleType === "bus" ? 5 : 20;
  const perKmRate = vehicleType === "bus" ? 1.5 : 8;

  let total = baseFare + distanceKm * perKmRate;

  if (vehicleId) {
    // Multiplier between 0.85 and 1.25 — a ±20-ish% spread, consistent
    // per vehicle every time (thanks to the hash), simulating how real
    // drivers/operators set slightly different rates.
    const multiplier = 0.85 + hashVehicleId(vehicleId) * 0.4;
    total = total * multiplier;
  }

  return Math.round(total);
}