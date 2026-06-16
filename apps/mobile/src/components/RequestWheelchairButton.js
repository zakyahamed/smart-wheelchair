import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";

import { auth } from "../firebase/config";
import { createRequestWithAutoAssignment } from "../services/autoAssign";

export default function RequestWheelchairButton({ navigation, style }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Room 1");

  const locationOptions = ["Toilet", "Room 1", "Room 2", "Room 3"];

  const openModal = () => {
    setOpen(true);
  };

  const handleRequest = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login required", "Please sign in first.");
      return;
    }

    if (!selectedLocation) {
      Alert.alert("Location required", "Please select a destination.");
      return;
    }

    try {
      setLoading(true);
      const result = await createRequestWithAutoAssignment({
        patientId: user.uid,
        patientEmail: user.email,
        location: selectedLocation,
        notes: notes.trim(),
      });

      const message = result.assignedWheelchairId
        ? `Wheelchair ${result.assignedWheelchairLabel || result.assignedWheelchairId} assigned.`
        : "Request added to queue.";

      Alert.alert("Request Sent", message, [
        {
          text: "OK",
          onPress: () => {},
        },
      ]);

      setNotes("");
      setOpen(false);

      if (result.assignedWheelchairId) {
        navigation?.navigate?.("Track", { requestId: result.id });
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Request failed", e.message || "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={[styles.button, style]} onPress={openModal}>
        <Text style={styles.buttonText}>Request Wheelchair</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Request Wheelchair</Text>

            <Text style={styles.optionLabel}>Select pickup location</Text>
            <View style={styles.locationOptions}>
              {locationOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.locationOption,
                    option === selectedLocation && styles.locationOptionActive,
                  ]}
                  onPress={() => setSelectedLocation(option)}
                >
                  <Text
                    style={[
                      styles.locationOptionText,
                      option === selectedLocation && styles.locationOptionTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              style={styles.input}
              placeholderTextColor="#666"
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.primary, loading && styles.disabled]}
                onPress={handleRequest}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Request Now</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghost}
                onPress={() => setOpen(false)}
                disabled={loading}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#1463ff",
    borderRadius: 8,
    padding: 15,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  optionLabel: {
    color: "#3d4b63",
    fontWeight: "700",
    marginBottom: 10,
  },
  locationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  locationOption: {
    borderWidth: 1,
    borderColor: "#cfd7e6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#f9fbff",
  },
  locationOptionActive: {
    borderColor: "#1463ff",
    backgroundColor: "#e7f0ff",
  },
  locationOptionText: {
    color: "#3d4b63",
    fontWeight: "600",
  },
  locationOptionTextActive: {
    color: "#1463ff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e6edf8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  primary: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#1463ff",
    borderRadius: 8,
    padding: 12,
  },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#fff", fontWeight: "700" },
  ghost: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  ghostText: { color: "#1463ff", fontWeight: "700" },
});
