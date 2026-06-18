import React, { useEffect } from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { initializeFloorPlan } from "./src/services/roomService";

export default function App() {
  useEffect(() => {
    initializeFloorPlan();
  }, []);

  return <AppNavigator />;
}