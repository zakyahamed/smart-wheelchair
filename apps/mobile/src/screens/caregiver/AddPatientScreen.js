import React, { useState, useEffect } from "react";
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
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, getApp, getApps } from "firebase/app";
import { db, auth, firebaseConfig } from "../../firebase/config";

export default function AddPatientScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingRooms, setFetchingRooms] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const docRef = doc(db, "floorPlan", "locations");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          setRooms(data.rooms); // assuming rooms is an array or object
        } else {
          console.log("No such document!");
          setRooms([]);
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setFetchingRooms(false);
      }
    };

    fetchRooms();
  }, []);

  const handleAddPatient = async () => {
    if (!name || !email || !password || !selectedRoom) {
      Alert.alert("Error", "Please fill all fields and select a room");
      return;
    }

    setLoading(true);
    let secondaryApp;

    try {
      // 1. Create the user in Firebase Auth without logging out the caregiver
      // We use a secondary app instance for this
      const appName = `secondary-app-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password,
      );
      const newUser = userCredential.user;

      // 2. Create user document with role
      await setDoc(doc(db, "users", newUser.uid), {
        email: email,
        role: "patient",
        createdAt: serverTimestamp(),
      });

      // 3. Create patient details document
      await addDoc(collection(db, "patients"), {
        uid: newUser.uid,
        name: name,
        email: email,
        room: selectedRoom.name || selectedRoom.id,
        caregiverId: auth.currentUser?.uid,
        wheelchairId: null,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Patient account created successfully");
      navigation.navigate("Patients");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to create patient account");
    } finally {
      setLoading(false);
      // Clean up secondary app
      if (secondaryApp) {
        secondaryApp.delete().catch(console.error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Patient Account</Text>
        <Text style={styles.subtitle}>
          Register a new patient and set their login credentials.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            placeholder="patient@example.com"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Login Password</Text>
          <TextInput
            placeholder="Minimum 6 characters"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />

          <Text style={styles.label}>Assign Room (Location)</Text>
          {fetchingRooms ? (
            <ActivityIndicator
              size="small"
              color="#1463ff"
              style={{ marginVertical: 10 }}
            />
          ) : (
            <View style={styles.roomsContainer}>
              {rooms.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={[
                    styles.roomCard,
                    selectedRoom?.id === room.id && styles.roomCardSelected,
                  ]}
                  onPress={() => setSelectedRoom(room)}
                >
                  <Text
                    style={[
                      styles.roomText,
                      selectedRoom?.id === room.id && styles.roomTextSelected,
                    ]}
                  >
                    {room.name || room.id}
                  </Text>
                </TouchableOpacity>
              ))}
              {rooms.length === 0 && (
                <Text style={styles.emptyRooms}>
                  No rooms found in database.
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAddPatient}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Patient Account</Text>
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
    lineHeight: 22,
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
  roomsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  roomCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  roomCardSelected: {
    backgroundColor: "#1463ff",
    borderColor: "#1463ff",
  },
  roomText: {
    color: "#475569",
    fontWeight: "600",
  },
  roomTextSelected: {
    color: "#fff",
  },
  emptyRooms: {
    color: "#94a3b8",
    fontStyle: "italic",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#1463ff",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
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
