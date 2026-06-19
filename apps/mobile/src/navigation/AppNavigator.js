import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { firebase } from "../firebase/config";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";

// Patient Screens
import HistoryScreen from "../screens/patient/HistoryScreen";
import TrackWheelchairScreen from "../screens/patient/TrackWheelchairScreen";
import WebcamViewerScreen from "../screens/patient/WebcamViewerScreen";

// Caregiver Screens
import AddPatientScreen from "../screens/caregiver/AddPatientScreen";
import AddWheelchairScreen from "../screens/caregiver/AddWheelchairScreen";
import CaregiverDashboardScreen from "../screens/caregiver/CaregiverDashboardScreen";
import ManagePatientsScreen from "../screens/caregiver/ManagePatientsScreen";
import RequestQueueScreen from "../screens/caregiver/RequestQueueScreen";
import WheelchairManagementScreen from "../screens/caregiver/WheelchairManagementScreen";
import SelectDestinationScreen from "../screens/patient/SelectDestinationScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);

      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const doc = await firebase
          .firestore()
          .collection("users")
          .doc(firebaseUser.uid)
          .get();

        const data = doc.data();

        setRole(data?.role || "patient");

      } catch (err) {
        console.log("Role fetch error:", err);
        setRole("patient");
      } finally {
        setUser(firebaseUser);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* AUTH FLOW */}
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : null}

        {/* PATIENT FLOW */}
        {user && role !== "caregiver" && (
          <>
            <Stack.Screen name="Home" component={HistoryScreen} />
            <Stack.Screen name="Track" component={TrackWheelchairScreen} />
            <Stack.Screen name="Webcam" component={WebcamViewerScreen} />
            <Stack.Screen name="SelectDestination" component={SelectDestinationScreen}/>
          </>
        )}

        {/* CAREGIVER FLOW */}
        {user && role === "caregiver" && (
          <>
            <Stack.Screen name="CaregiverHome" component={CaregiverDashboardScreen} />
            <Stack.Screen name="Requests" component={RequestQueueScreen} />
            <Stack.Screen name="Patients" component={ManagePatientsScreen} />
            <Stack.Screen name="AddPatient" component={AddPatientScreen} />
            <Stack.Screen name="Wheelchairs" component={WheelchairManagementScreen} />
            <Stack.Screen name="AddWheelchair" component={AddWheelchairScreen} />
            <Stack.Screen name="Webcam" component={WebcamViewerScreen} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}
