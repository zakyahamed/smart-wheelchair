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

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase/config";

export default function AddPatientScreen({ navigation }) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddPatient = async () => {
    if (!name || !room) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "patients"), {
        name: name,
        room: room,
        caregiverId: auth.currentUser?.uid,
        wheelchairId: null,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Patient added successfully");

      setName("");
      setRoom("");

      navigation.navigate("Patients");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Patient</Text>

      <TextInput
        placeholder="Patient Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Room Number"
        value={room}
        onChangeText={setRoom}
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleAddPatient}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Add Patient</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
