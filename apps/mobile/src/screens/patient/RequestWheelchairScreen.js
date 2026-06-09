import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Location from "expo-location";

import { auth } from "../../firebase/config";
import { createRequestWithAutoAssignment } from "../../services/autoAssign";

export default function RequestWheelchairScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [locationText, setLocationText] = useState("Fetching location...");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);

  useEffect(() => {
    fetchLocation();
  }, []);

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

      const current =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      setLocationText(
        `${current.coords.latitude.toFixed(6)}, ${current.coords.longitude.toFixed(6)}`
      );
    } catch (error) {
      console.log(error);
      setLocationText("Unable to determine location");
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Login required",
        "Please sign in first."
      );
      return;
    }

    if (!location) {
      Alert.alert(
        "Location Required",
        "Please obtain your current location."
      );
      return;
    }

    try {
      setLoading(true);

      const result =
        await createRequestWithAutoAssignment({
          patientId: user.uid,
          patientEmail: user.email,

          location,

          notes: notes.trim(),
        });

      const message = result.assignedWheelchairId
        ? `Wheelchair ${result.assignedWheelchairLabel || result.assignedWheelchairId} assigned.`
        : "Request added to queue.";

      Alert.alert("Request Sent", message, [
        {
          text: "Track",
          onPress: () =>
            navigation.replace("Track", {
              requestId: result.id,
            }),
        },
      ]);

      setNotes("");
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Request Failed",
        error.message || "Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Request Wheelchair
        </Text>

        <Text style={styles.subtitle}>
          Your current location will be used.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>
          Current Location
        </Text>

        <View style={styles.locationBox}>
          {gettingLocation ? (
            <ActivityIndicator />
          ) : (
            <Text>{locationText}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchLocation}
        >
          <Text style={styles.refreshText}>
            Refresh Location
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>
          Notes (Optional)
        </Text>

        <TextInput
          multiline
          placeholder="Additional instructions..."
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, styles.notesInput]}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          disabled={loading}
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Request Wheelchair
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
    padding: 20,
    paddingTop: 56,
  },
  header: {
    marginBottom: 24,
  },
  backText: {
    color: "#1463ff",
    fontWeight: "700",
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    color: "#687386",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
  },
  label: {
    fontWeight: "700",
    marginBottom: 8,
  },
  locationBox: {
    borderWidth: 1,
    borderColor: "#cfd7e6",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  refreshButton: {
    marginBottom: 20,
  },
  refreshText: {
    color: "#1463ff",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cfd7e6",
    borderRadius: 8,
    padding: 12,
  },
  notesInput: {
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#1463ff",
    borderRadius: 8,
    alignItems: "center",
    padding: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
