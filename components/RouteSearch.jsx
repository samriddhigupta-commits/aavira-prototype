// components/RouteSearch.jsx

"use client";

import { useState } from "react";

export default function RouteSearch({ stops, onSearch }) {
  const [fromStopId, setFromStopId] = useState("");
  const [toStopId, setToStopId] = useState("");

  function handleSearchClick() {
    if (!fromStopId || !toStopId) {
      alert("Please select both a From and To stop.");
      return;
    }
    onSearch(Number(fromStopId), Number(toStopId));
  }

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
        <select
          value={fromStopId}
          onChange={(e) => setFromStopId(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">Select...</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>{stop.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
        <select
          value={toStopId}
          onChange={(e) => setToStopId(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">Select...</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>{stop.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSearchClick}
        className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700"
      >
        Search
      </button>
    </div>
  );
}