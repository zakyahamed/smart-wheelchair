import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import * as Location from "expo-location";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { assignOldestPendingRequestToWheelchair } from "../../services/autoAssign";
import { getRoomCoordinates } from "../../services/roomService";

export default function AddWheelchairScreen({ navigation }) {
  const [chairId, setChairId] = useState("");
  const [name, setName] = useState("");
  const [battery, setBattery] = useState("");
  const [status, setStatus] = useState("Available");
  const [tags, setTags] = useState("");
  const [dockingLocation, setDockingLocation] = useState("Toilet");

  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState("No location selected");
  const [gettingLocation, setGettingLocation] = useState(false);

  const dockingOptions = ["Toilet", "Room 1", "Room 2", "Room 3"];

  const [loading, setLoading] = useState(false);

  const fetchLocation = async () => {
    try {
      setGettingLocation(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is needed."
        );
        setLocationText("Location unavailable");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setLocation(coords);

      setLocationText(
        `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
      );
    } catch (error) {
      console.log(error);
      setLocationText("Unable to determine location");
    } finally {
      setGettingLocation(false);
    }
  };

  const handleAddWheelchair = async () => {
    if (!chairId || !name || !battery) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const dockingCoords = await getRoomCoordinates(dockingLocation);

      const wheelchairRef = await addDoc(collection(db, "wheelchairs"), {
        chairId,
        name,
        battery: Number(battery),
        status,
        tags: tagArray,

        dockingLocation,
        location: dockingCoords || null,
        dockingPosition: dockingCoords || null,
        locationUpdatedAt: serverTimestamp(),
        isOpen: false,

        assignedPatient: null,
        activeRequestId: null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const assignedRequestId =
        status === "Available"
          ? await assignOldestPendingRequestToWheelchair(wheelchairRef.id)
          : null;

      Alert.alert(
        "Success",
        assignedRequestId
          ? "Wheelchair added and auto-assigned."
          : "Wheelchair added successfully"
      );

      setChairId("");
      setName("");
      setBattery("");
      setTags("");
      setStatus("Available");
      setDockingLocation("Toilet");
      setLocation(null);
      setLocationText("No location selected");

      navigation.navigate("CaregiverHome");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add wheelchair");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Add Wheelchair</Text>

      <TextInput
        placeholder="Chair ID (e.g. WC-101)"
        value={chairId}
        onChangeText={setChairId}
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Wheelchair Name (e.g. ICU Chair 1)"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Battery %"
        value={battery}
        onChangeText={setBattery}
        keyboardType="numeric"
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Tags (comma separated: ICU, Emergency, VIP)"
        value={tags}
        onChangeText={setTags}
        style={styles.input}
        placeholderTextColor="#999"
      />

      {/* LOCATION SECTION */}
      <TouchableOpacity
        onPress={fetchLocation}
        style={styles.locationButton}
      >
        {gettingLocation ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.locationButtonText}>
            Fetch Device Location
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.locationText}>{locationText}</Text>

      <Text style={styles.label}>Docking Position</Text>
      <View style={styles.dockingOptions}>
        {dockingOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.dockingOption,
              dockingLocation === option && styles.dockingOptionActive,
            ]}
            onPress={() => setDockingLocation(option)}
          >
            <Text
              style={[
                styles.dockingOptionText,
                dockingLocation === option && styles.dockingOptionTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Status</Text>

      <View style={styles.statusOptions}>
        {["Available", "Charging", "Maintenance"].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.statusOption,
              status === option && styles.statusOptionActive,
            ]}
            onPress={() => setStatus(option)}
          >
            <Text
              style={[
                styles.statusOptionText,
                status === option && styles.statusOptionTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleAddWheelchair}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Add Wheelchair</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 100,
  },
  backText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e4e7ec",
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: "#f9fafb",
  },
  label: {
    marginBottom: 5,
    fontWeight: "bold",
  },

  locationButton: {
    backgroundColor: "#1463ff",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  locationButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  locationText: {
    marginBottom: 15,
    color: "#555",
    fontSize: 13,
  },

  dockingOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  dockingOption: {
    borderWidth: 1,
    borderColor: "#cfd7e6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#f9fbff",
  },
  dockingOptionActive: {
    borderColor: "#1463ff",
    backgroundColor: "#e7f0ff",
  },
  dockingOptionText: {
    color: "#3d4b63",
    fontWeight: "600",
  },
  dockingOptionTextActive: {
    color: "#1463ff",
  },

  statusOptions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statusOption: {
    borderColor: "#ccc",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  statusOptionActive: {
    backgroundColor: "#e7f3eb",
    borderColor: "#28a745",
  },
  statusOptionText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  statusOptionTextActive: {
    color: "#1f7a36",
  },
  button: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});