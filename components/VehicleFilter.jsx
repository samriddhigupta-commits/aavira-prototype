// components/VehicleFilter.jsx

"use client";

export default function VehicleFilter({ selectedType, onSelectType }) {
  const filters = [
    { label: "All", value: "all" },
    { label: "🚌 Bus", value: "bus" },
    { label: "🚕 Auto/E-Rickshaw", value: "e-rickshaw" },
  ];

  return (
    <div className="flex gap-2">
      {filters.map((filter) => {
        const isActive = selectedType === filter.value;
        return (
          <button
            key={filter.value}
            onClick={() => onSelectType(filter.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}