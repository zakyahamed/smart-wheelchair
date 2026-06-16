import React, { useEffect } from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { initializeFloorPlan } from "./src/services/roomService";
import { getMQTTInstance } from './src/services/mqttService';
import MQTT_CONFIG from './src/config/mqttConfig';



export default function App() {
  useEffect(() => {
    initializeFloorPlan();
    
    const brokerUrl = MQTT_CONFIG.getBrokerUrl();
    console.log('[App] Initializing MQTT connection to:', brokerUrl);
    
    const mqtt = getMQTTInstance();
    mqtt.connect(brokerUrl).catch(err => console.error('[App] MQTT connect failed', err));

    // Example: subscribe to wheelchair status updates
    mqtt.subscribe(MQTT_CONFIG.TOPICS.WHEELCHAIR_STATUS_ALL, (data, topic) => {
      console.log('[App] MQTT status received', topic, data);
      // update UI / Firestore as needed
    });

    return () => mqtt.disconnect();
  }, []);


  return <AppNavigator />;
}