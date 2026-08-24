"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Navigation, Clock, X, Info } from "lucide-react";
import useVehicleSocket from "../../hooks/useVehicleSocket";
import VehicleFilter from "../../components/VehicleFilter";
import RouteSearch from "../../components/RouteSearch";

const LiveMap = dynamic(() => import("../../components/LiveMap"), { ssr: false });

export default function TestMapPage() {
  const liveVehicles = useVehicleSocket("ws://localhost:4000");

  const [selectedType, setSelectedType] = useState("all");
  const [searchStopIds, setSearchStopIds] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);

  // Fake stops for routing
  const fakeStops = [
    { id: 1, name: "Stop A - Campus Gate", lat: 26.4499, lng: 80.3319 },
    { id: 2, name: "Stop B - Market Road", lat: 26.4550, lng: 80.3400 },
    { id: 3, name: "Stop C - Railway Station", lat: 26.4600, lng: 80.3470 },
  ];

  const fakeDestination = { lat: 26.4600, lng: 80.3470 };

  const vehicleRoutes = {
    bus: {
      stopOrder: [1, 2, 3],
      coords: [[26.4499, 80.3319], [26.4520, 80.3350], [26.4550, 80.3400], [26.4575, 80.3435], [26.4600, 80.3470]],
    },
    "e-rickshaw": {
      stopOrder: [3, 2, 1],
      coords: [[26.4600, 80.3470], [26.4560, 80.3410], [26.4530, 80.3360], [26.4499, 80.3319]],
    },
  };

  function handleRouteSearch(fromId, toId) {
    setSearchStopIds({ from: fromId, to: toId });
    setIsBottomSheetOpen(true);
  }

  // --- Filtering Logic ---
  const allVehicles = liveVehicles || [];
  const typeFiltered = selectedType === "all" ? allVehicles : allVehicles.filter((v) => v.type === selectedType);

  function vehicleServesRouteInOrder(vehicleType, fromId, toId) {
    const routeInfo = vehicleRoutes[vehicleType];
    if (!routeInfo) return false;
    const fromIndex = routeInfo.stopOrder.indexOf(fromId);
    const toIndex = routeInfo.stopOrder.indexOf(toId);
    return fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex;
  }

  const finalFilteredVehicles = !searchStopIds
    ? typeFiltered
    : typeFiltered.filter((v) => vehicleServesRouteInOrder(v.type, searchStopIds.from, searchStopIds.to));

  // --- Route Drawing Logic ---
  function findCoordIndexForStop(vehicleType, stopId) {
    const stop = fakeStops.find((s) => s.id === stopId);
    if (!stop) return -1;
    const routeInfo = vehicleRoutes[vehicleType];
    if (!routeInfo) return -1;
    return routeInfo.coords.findIndex((point) => point[0] === stop.lat && point[1] === stop.lng);
  }

  function getDisplayRouteCoordinates() {
    if (!searchStopIds) return [];
    const matchingType = Object.keys(vehicleRoutes).find((type) =>
      vehicleServesRouteInOrder(type, searchStopIds.from, searchStopIds.to)
    );
    if (!matchingType) return [];
    return vehicleRoutes[matchingType].coords;
  }

  function getHighlightedSegment() {
    if (!searchStopIds) return [];
    const matchingType = Object.keys(vehicleRoutes).find((type) =>
      vehicleServesRouteInOrder(type, searchStopIds.from, searchStopIds.to)
    );
    if (!matchingType) return [];
    const fromIndex = findCoordIndexForStop(matchingType, searchStopIds.from);
    const toIndex = findCoordIndexForStop(matchingType, searchStopIds.to);
    if (fromIndex === -1 || toIndex === -1) return [];
    return vehicleRoutes[matchingType].coords.slice(fromIndex, toIndex + 1);
  }

  // --- UI Helpers ---
  const getVehicleIcon = (type) => {
    switch (type) {
      case "bus": return "🚌";
      case "e-rickshaw": return "🛺";
      case "auto": return "🚕";
      default: return "🚐";
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-screen h-screen overflow-hidden bg-gray-50 font-sans">
      
      {/* 
        DESKTOP SIDEBAR / MOBILE TOP OVERLAY 
      */}
      <div className="absolute top-0 left-0 right-0 z-20 md:relative md:w-96 md:h-full bg-transparent md:bg-white md:shadow-2xl flex flex-col pointer-events-none md:pointer-events-auto">
        
        {/* Search & Filter Container */}
        <div className="pointer-events-auto m-4 md:m-0 md:p-6 bg-white rounded-2xl md:rounded-none shadow-xl md:shadow-none border border-gray-100 md:border-none">
          <div className="p-4 md:p-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-black tracking-tight text-indigo-600 flex items-center gap-2">
                <Navigation className="w-6 h-6" /> Aavira
              </h1>
            </div>

            <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wider">Plan your journey</p>
            
            <div className="relative z-30">
              <RouteSearch stops={fakeStops} onSearch={handleRouteSearch} />
            </div>

            {searchStopIds && (
              <button
                onClick={() => setSearchStopIds(null)}
                className="flex items-center gap-1 text-sm text-red-500 mt-3 font-medium hover:bg-red-50 py-1 px-2 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" /> Clear Route Search
              </button>
            )}

            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Transport Mode</p>
              <VehicleFilter selectedType={selectedType} onSelectType={setSelectedType} />
            </div>
          </div>
        </div>

        {/* Desktop List View (Hidden on mobile) */}
        <div className="hidden md:flex flex-col flex-1 overflow-y-auto bg-gray-50 p-6 border-t border-gray-200">
          <VehicleListHeader count={finalFilteredVehicles.length} />
          <VehicleList 
            vehicles={finalFilteredVehicles} 
            getIcon={getVehicleIcon} 
          />
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div className="flex-1 relative z-0 h-full w-full">
        <LiveMap
          vehicles={finalFilteredVehicles}
          stops={fakeStops}
          destination={fakeDestination}
          routeCoordinates={getDisplayRouteCoordinates()} 
          highlightSegment={getHighlightedSegment()} 
        />
      </div>

      {/* 
        MOBILE BOTTOM SHEET 
      */}
      <div className={`md:hidden absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out ${isBottomSheetOpen ? "translate-y-0" : "translate-y-[85%]"}`}>
        
        {/* Drag Handle / Toggle */}
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
          />
        </div>
      </div>
    </div>
  );
}

// --- Separated UI Components ---

function VehicleListHeader({ count }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-900">
        {count} {count === 1 ? 'Vehicle' : 'Vehicles'} Nearby
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

function VehicleList({ vehicles, getIcon }) {
  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Info className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No vehicles found for this route.</p>
        <p className="text-sm text-gray-400 mt-1">Try selecting a different transport mode.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicles.map((vehicle) => {
        // Mock ETA for UI purposes
        const simulatedETA = Math.floor(Math.random() * 10) + 2; 

        return (
          <div key={vehicle.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              
              {/* Left Side: Icon & Info */}
              <div className="flex gap-3">
                <div className="text-3xl bg-gray-50 w-12 h-12 flex items-center justify-center rounded-xl border border-gray-100">
                  {getIcon(vehicle.type)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 capitalize">
                    {vehicle.type} - {vehicle.id.slice(-4)}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {vehicle.speed > 0 ? "On Route" : "Stationary"}
                  </p>
                </div>
              </div>

              {/* Right Side: ETA */}
              <div className="text-right">
                <p className="text-sm font-bold text-indigo-600 flex items-center justify-end gap-1">
                  <Clock className="w-4 h-4" /> {simulatedETA} min
                </p>
                <p className="text-xs text-gray-400 mt-1">{vehicle.speed} km/h</p>
              </div>
            </div>

            {/* Bottom Row: Actions */}
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-end">
              <button className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors shadow-sm">
                Track Vehicle
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}