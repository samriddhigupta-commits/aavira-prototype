"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Navigation, X, Info, MapPin, IndianRupee, Clock } from "lucide-react";
import useVehicleSocket from "../../hooks/useVehicleSocket";
import VehicleFilter from "../../components/VehicleFilter";
import RouteSearch from "../../components/RouteSearch";
import { fetchRoadRoute, calculateDistanceKm, estimateCost } from "../../lib/geoUtils";

const LiveMap = dynamic(() => import("../../components/LiveMap"), { ssr: false });

const fakeStops = [
  { id: 1, name: "Stop A - Campus Gate", lat: 26.4499, lng: 80.3319 },
  { id: 2, name: "Stop B - Market Road", lat: 26.4550, lng: 80.3400 },
  { id: 3, name: "Stop C - Railway Station", lat: 26.4600, lng: 80.3470 },
  { id: 4, name: "Stop D - Green Park", lat: 26.4100, lng: 80.3050 },
  { id: 5, name: "Stop E - Bus Depot", lat: 26.4000, lng: 80.3250 },
];

const routesList = [
  { id: "route-1", name: "Campus Gate → Railway Station", vehicleId: "bus-01", stopOrder: [1, 2, 3] },
  { id: "route-2", name: "Campus Gate → Railway Station (Alt Road)", vehicleId: "bus-02", stopOrder: [1, 2, 3] },
  { id: "route-3", name: "Green Park → Bus Depot", vehicleId: "bus-03", stopOrder: [4, 5] },
];

function findStopById(id) {
  return fakeStops.find((s) => s.id === id);
}

function findMatchingRoute(fromId, viaId, toId) {
  return (
    routesList.find((route) => {
      const fromIdx = route.stopOrder.indexOf(fromId);
      const toIdx = route.stopOrder.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) return false;

      if (viaId) {
        const viaIdx = route.stopOrder.indexOf(viaId);
        if (viaIdx === -1 || viaIdx <= fromIdx || viaIdx >= toIdx) return false;
      }

      return true;
    }) || null
  );
}

export default function TestMapPage() {
  const liveVehicles = useVehicleSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000");

  const [selectedType, setSelectedType] = useState("all");
  const [searchSelection, setSearchSelection] = useState(null);
  const [matchedRoute, setMatchedRoute] = useState(null);
  const [routeSegments, setRouteSegments] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);

  useEffect(() => {
    if (!searchSelection) {
      setMatchedRoute(null);
      setRouteSegments([]);
      setRouteDistanceKm(null);
      return;
    }

    const route = findMatchingRoute(
      searchSelection.fromId,
      searchSelection.viaId,
      searchSelection.toId
    );

    setMatchedRoute(route);
    setRouteLoading(true);

    const fromStop = findStopById(searchSelection.fromId);
    const viaStop = searchSelection.viaId ? findStopById(searchSelection.viaId) : null;
    const toStop = findStopById(searchSelection.toId);

    async function loadRouteSegments() {
      const segments = [];
      let totalDistanceKm = 0;
      const lineColor = route ? "#f97316" : "#a855f7";

      if (viaStop) {
        const leg1 = await fetchRoadRoute(fromStop, viaStop);
        const leg2 = await fetchRoadRoute(viaStop, toStop);

        segments.push({
          coords: leg1 ? leg1.coords : [[fromStop.lat, fromStop.lng], [viaStop.lat, viaStop.lng]],
          color: lineColor,
        });
        segments.push({
          coords: leg2 ? leg2.coords : [[viaStop.lat, viaStop.lng], [toStop.lat, toStop.lng]],
          color: route ? "#facc15" : lineColor,
        });

        totalDistanceKm =
          (leg1 ? leg1.distanceKm : calculateDistanceKm(fromStop.lat, fromStop.lng, viaStop.lat, viaStop.lng)) +
          (leg2 ? leg2.distanceKm : calculateDistanceKm(viaStop.lat, viaStop.lng, toStop.lat, toStop.lng));
      } else {
        const leg = await fetchRoadRoute(fromStop, toStop);

        segments.push({
          coords: leg ? leg.coords : [[fromStop.lat, fromStop.lng], [toStop.lat, toStop.lng]],
          color: lineColor,
        });

        totalDistanceKm = leg ? leg.distanceKm : calculateDistanceKm(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng);
      }

      setRouteSegments(segments);
      setRouteDistanceKm(totalDistanceKm);
      setRouteLoading(false);
    }

    loadRouteSegments();
  }, [searchSelection]);

  function handleRouteSearch(selection) {
    setSearchSelection(selection);
    setIsBottomSheetOpen(true);
  }

  function clearSearch() {
    setSearchSelection(null);
  }

  const allVehicles = liveVehicles || [];

  // Pickup stop for the active search — used to calculate per-vehicle ETA.
  const pickupStop = searchSelection ? findStopById(searchSelection.fromId) : null;

  const finalFilteredVehicles =
    searchSelection && matchedRoute
      ? allVehicles.filter((v) => v.id === matchedRoute.vehicleId)
      : searchSelection && !matchedRoute
      ? allVehicles.filter((v) => v.type === "auto" || v.type === "e-rickshaw")
      : selectedType === "all"
      ? allVehicles
      : allVehicles.filter((v) => v.type === selectedType);

  const primaryEstimatedFare =
    routeDistanceKm !== null && finalFilteredVehicles.length > 0
      ? estimateCost(
          matchedRoute ? "bus" : "e-rickshaw",
          routeDistanceKm,
          finalFilteredVehicles[0].id
        )
      : null;

  const getVehicleIcon = (type) => {
    switch (type) {
      case "bus":
        return "🚌";
      case "e-rickshaw":
        return "🛺";
      case "auto":
        return "🚕";
      default:
        return "🚐";
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-screen h-screen overflow-hidden bg-gray-50 font-sans">
      <div className="absolute top-0 left-0 right-0 z-20 md:relative md:w-96 md:h-full bg-transparent md:bg-white md:shadow-2xl flex flex-col pointer-events-none md:pointer-events-auto">
        <div className="pointer-events-auto m-4 md:m-0 md:p-6 bg-white rounded-2xl md:rounded-none shadow-xl md:shadow-none border border-gray-100 md:border-none">
          <div className="p-4 md:p-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-black tracking-tight text-indigo-600 flex items-center gap-2">
                <Navigation className="w-6 h-6" /> Aavira
              </h1>
            </div>

            <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wider">
              Plan your journey
            </p>

            <RouteSearch stops={fakeStops} onSearch={handleRouteSearch} />

            {searchSelection && (
              <button
                onClick={clearSearch}
                className="flex items-center gap-1 text-sm text-red-500 mt-3 font-medium hover:bg-red-50 py-1 px-2 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" /> Clear Route Search
              </button>
            )}

            {searchSelection && (
              <div className="mt-3 text-sm">
                {routeLoading && <p className="text-gray-500">Finding route...</p>}

                {!routeLoading && matchedRoute && routeDistanceKm !== null && (
                  <div className="bg-indigo-50 rounded-lg p-3 space-y-1">
                    <p className="font-medium text-indigo-900">{matchedRoute.name}</p>
                    <p className="text-xs text-gray-600">
                      Distance: {routeDistanceKm.toFixed(1)} km
                    </p>
                    <p className="text-sm font-bold text-indigo-700 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" /> Fare: ₹{primaryEstimatedFare}
                    </p>
                  </div>
                )}

                {!routeLoading && !matchedRoute && routeDistanceKm !== null && (
                  <div className="bg-purple-50 rounded-lg p-3 space-y-1">
                    <p className="font-medium text-purple-900">
                      No direct bus — auto/e-rickshaw route shown
                    </p>
                    <p className="text-xs text-gray-600">
                      Road distance: {routeDistanceKm.toFixed(1)} km
                    </p>
                    <p className="text-xs text-gray-500">
                      Fares vary by vehicle — see options below
                    </p>
                  </div>
                )}
              </div>
            )}

            {!searchSelection && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">
                  Transport Mode
                </p>
                <VehicleFilter
                  selectedType={selectedType}
                  onSelectType={setSelectedType}
                />
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:flex flex-col flex-1 overflow-y-auto bg-gray-50 p-6 border-t border-gray-200">
          <VehicleListHeader count={finalFilteredVehicles.length} />
          <VehicleList
            vehicles={finalFilteredVehicles}
            getIcon={getVehicleIcon}
            routeDistanceKm={routeDistanceKm}
            matchedRoute={matchedRoute}
            pickupStop={pickupStop}
          />
        </div>
      </div>

      <div className="flex-1 relative z-0 h-full w-full">
        <LiveMap vehicles={finalFilteredVehicles} routeSegments={routeSegments} />
      </div>

      <div
        className={`md:hidden absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${
          isBottomSheetOpen ? "translate-y-0" : "translate-y-[85%]"
        }`}
      >
        <div
          className="w-full flex justify-center py-3 cursor-pointer"
          onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        <div className="px-5 pb-6 max-h-[50vh] overflow-y-auto">
          <VehicleListHeader count={finalFilteredVehicles.length} />
          <VehicleList
            vehicles={finalFilteredVehicles}
            getIcon={getVehicleIcon}
            routeDistanceKm={routeDistanceKm}
            matchedRoute={matchedRoute}
            pickupStop={pickupStop}
          />
        </div>
      </div>
    </div>
  );
}

function VehicleListHeader({ count }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-900">
        {count} {count === 1 ? "Vehicle" : "Vehicles"}
      </h2>
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Live
      </span>
    </div>
  );
}

function VehicleList({ vehicles, getIcon, routeDistanceKm, matchedRoute, pickupStop }) {
  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Info className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No vehicles found.</p>
        <p className="text-sm text-gray-400 mt-1">Try a different search or filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicles.map((vehicle) => {
        const vehicleFare =
          routeDistanceKm !== null
            ? estimateCost(
                matchedRoute ? "bus" : vehicle.type,
                routeDistanceKm,
                vehicle.id
              )
            : null;

        // Uses effective speed fallback (15 km/h) if vehicle speed is 0 or unrecorded
        const effectiveSpeed = vehicle.speed && vehicle.speed > 0 ? vehicle.speed : 15;
        const etaMinutes =
          pickupStop && vehicle.lat != null && vehicle.lng != null
            ? Math.max(
                1,
                Math.round(
                  (calculateDistanceKm(
                    vehicle.lat,
                    vehicle.lng,
                    pickupStop.lat,
                    pickupStop.lng
                  ) /
                    effectiveSpeed) *
                    60
                )
              )
            : null;

        return (
          <div
            key={vehicle.id}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="text-3xl bg-gray-50 w-12 h-12 flex items-center justify-center rounded-xl border border-gray-100">
                  {getIcon(vehicle.type)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 capitalize">
                    {vehicle.type} - {vehicle.id.slice(-2)}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> On Route
                  </p>
                  {etaMinutes !== null ? (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5 font-medium">
                      <Clock className="w-3 h-3" /> {etaMinutes} min away
                      {vehicle.speed === 0 && " (idle)"}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> ETA unavailable
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                {vehicleFare !== null ? (
                  <p className="text-sm font-bold text-indigo-600 flex items-center justify-end gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> {vehicleFare}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">{vehicle.speed ?? 0} km/h</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
