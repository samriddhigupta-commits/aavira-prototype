// components/RouteSearch.jsx

"use client";

import { useState } from "react";

export default function RouteSearch({ stops, onSearch }) {
  const [fromStopId, setFromStopId] = useState("");
  const [viaStopId, setViaStopId] = useState(""); // optional
  const [toStopId, setToStopId] = useState("");

  function handleSearchClick() {
    if (!fromStopId || !toStopId) {
      alert("Please select both a From and To stop.");
      return;
    }
    if (fromStopId === toStopId) {
      alert("From and To can't be the same stop.");
      return;
    }

    // We now send ONE object instead of two separate arguments — this
    // makes it easy to add viaId without breaking the function's shape
    // every time we add a new search field in the future.
    onSearch({
      fromId: Number(fromStopId),
      viaId: viaStopId ? Number(viaStopId) : null,
      toId: Number(toStopId),
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <select
            value={fromStopId}
            onChange={(e) => setFromStopId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="">Select...</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <select
            value={toStopId}
            onChange={(e) => setToStopId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="">Select...</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Via (optional — middle stop)
        </label>
        <select
          value={viaStopId}
          onChange={(e) => setViaStopId(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">None</option>
          {stops.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSearchClick}
        className="w-full bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
      >
        Search Route
      </button>
    </div>
  );
}