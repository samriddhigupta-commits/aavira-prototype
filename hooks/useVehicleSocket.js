
"use client"; //it can't run on the server

import { useState, useEffect } from "react";


export default function useVehicleSocket(socketUrl) {

  const [vehicleLocation, setVehicleLocation] = useState(null);


  useEffect(() => {
    // Create the actual WebSocket connection to our backend.
    const socket = new WebSocket(socketUrl);

   
    socket.onopen = () => {
      console.log("✅ Connected to vehicle tracking server:", socketUrl);
    };

    
    socket.onmessage = (event) => {
      const newLocation = JSON.parse(event.data);

      console.log("📍 Received update:", newLocation);
      setVehicleLocation(newLocation);
    };
    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("🔌 Disconnected from vehicle tracking server.");
    };
    // cleanup function
    return () => {
      socket.close();
    };
  }, [socketUrl]); // re-run only if the URL ever changes
  return vehicleLocation;
}