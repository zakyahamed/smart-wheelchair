import React, { useEffect } from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { initializeFloorPlan } from "./src/services/roomService";
import { getMQTTInstance } from './src/services/mqttService';
import MQTT_CONFIG from './src/config/mqttConfig';



export default function App() {
  useEffect(() => {
    initializeFloorPlan();
    const mqtt = getMQTTInstance();
    mqtt.connect(MQTT_CONFIG.getBrokerUrl(), {
      username: MQTT_CONFIG.USERNAME,
      password: MQTT_CONFIG.PASSWORD,
    }).catch(err => console.error('MQTT connect failed', err));

    // Example: subscribe to wheelchair status updates
    mqtt.subscribe(MQTT_CONFIG.TOPICS.WHEELCHAIR_STATUS_ALL, (data, topic) => {
      console.log('MQTT status', topic, data);
      // update UI / Firestore as needed
    });

    return () => mqtt.disconnect();
  }, []);


  return <AppNavigator />;
}