import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";

import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db, auth } from "../../firebase/config";

export default function ManagePatientsScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(db, "patients"),
        where("caregiverId", "==", auth.currentUser?.uid)
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      setPatients(list);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDelete = async (patientId) => {
    try {
      await deleteDoc(doc(db, "patients", patientId));
      Alert.alert("Success", "Patient deleted");
      fetchPatients();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to delete patient");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text>Room: {item.room}</Text>
      <Text>Wheelchair: {item.wheelchairId || "Not Assigned"}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert(
              "Confirm",
              "Delete this patient?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => handleDelete(item.id),
                },
              ]
            )
          }
        >
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Manage Patients</Text>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddPatient")}
        >
          <Text style={styles.addButtonText}>+ Add Patient</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.wheelchairButton}
          onPress={() => navigation.navigate("AddWheelchair")}
        >
          <Text style={styles.wheelchairButtonText}>+ Add Wheelchair</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={fetchPatients}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  backText: {
    color: "#1463ff",
    fontWeight: "700",
    marginBottom: 18,
    marginTop: 36,
  },
  quickActions: {
    gap: 10,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  wheelchairButton: {
    alignItems: "center",
    backgroundColor: "#e8eefc",
    borderRadius: 8,
    padding: 12,
  },
  wheelchairButtonText: {
    color: "#174899",
    fontWeight: "bold",
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  deleteBtn: {
    backgroundColor: "red",
    padding: 8,
    borderRadius: 6,
  },
  btnText: {
    color: "#fff",
  },
});
