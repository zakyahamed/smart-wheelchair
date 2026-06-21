import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

  const [locationText, setLocationText] = useState("No location fetched");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const dockingOptions = ["Room 1", "Room 2", "Room 3","Docking Position"];

  const fetchLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Required", "Location permission is needed.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocationText(`${current.coords.latitude.toFixed(6)}, ${current.coords.longitude.toFixed(6)}`);
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
      const tagArray = tags.split(",").map(t => t.trim()).filter(Boolean);
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

      await assignOldestPendingRequestToWheelchair(wheelchairRef.id);

      Alert.alert("Success", "Wheelchair added and ready for assignment.");
      navigation.navigate("CaregiverHome");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add wheelchair");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Add New Wheelchair</Text>
        <Text style={styles.subtitle}>Register a new wheelchair unit to the smart fleet.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Identifier (ID)</Text>
          <TextInput
            placeholder="WC-101"
            value={chairId}
            onChangeText={setChairId}
            style={styles.input}
          />

          <Text style={styles.label}>Display Name</Text>
          <TextInput
            placeholder="Smart Chair A"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Battery %</Text>
              <TextInput
                placeholder="100"
                value={battery}
                onChangeText={setBattery}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.label}>Tags (Comma separated)</Text>
              <TextInput
                placeholder="ICU, Emergency"
                value={tags}
                onChangeText={setTags}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Initial Docking Station</Text>
          <View style={styles.optionsGrid}>
            {dockingOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionCard, dockingLocation === opt && styles.optionCardSelected]}
                onPress={() => setDockingLocation(opt)}
              >
                <Text style={[styles.optionText, dockingLocation === opt && styles.optionTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Operational Status</Text>
          <View style={styles.optionsGrid}>
            {["Available", "Charging", "Maintenance"].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionCard, status === opt && styles.optionCardSelected]}
                onPress={() => setStatus(opt)}
              >
                <Text style={[styles.optionText, status === opt && styles.optionTextSelected]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.locationSection}>
            <Text style={styles.label}>Current Physical Location</Text>
            <TouchableOpacity onPress={fetchLocation} style={styles.locationFetch}>
              <Text style={styles.locationFetchText}>
                {gettingLocation ? "Detecting..." : "Detect Current Location"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.locationValue}>{locationText}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAddWheelchair}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register Wheelchair</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  scrollContent: {
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#1463ff",
    fontWeight: "700",
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#162033",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#687386",
    marginBottom: 30,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d4b63",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    color: "#1e293b",
  },
  row: {
    flexDirection: "row",
    marginTop: 4,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 4,
  },
  optionCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionCardSelected: {
    backgroundColor: "#1463ff",
    borderColor: "#1463ff",
  },
  optionText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 13,
  },
  optionTextSelected: {
    color: "#fff",
  },
  locationSection: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  locationFetch: {
    backgroundColor: "#e8eefc",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  locationFetchText: {
    color: "#1463ff",
    fontWeight: "700",
    fontSize: 14,
  },
  locationValue: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
    color: "#64748b",
  },
  button: {
    backgroundColor: "#1463ff",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
    shadowColor: "#1463ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});