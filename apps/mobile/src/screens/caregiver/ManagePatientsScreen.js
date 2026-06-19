import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase/config";

export default function ManagePatientsScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Patients
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

      // Fetch Rooms
      const roomsSnapshot = await getDocs(collection(db, "rooms"));
      const roomsList = roomsSnapshot.docs.map(d => d.data().name || d.id);
      setRooms(roomsList);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (patientId) => {
    try {
      await deleteDoc(doc(db, "patients", patientId));
      Alert.alert("Success", "Patient deleted");
      fetchData();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to delete patient");
    }
  };

  const openEditModal = (patient) => {
    setSelectedPatient(patient);
    setEditName(patient.name);
    setEditRoom(patient.room);
    setEditModalVisible(true);
  };

  const handleUpdatePatient = async () => {
    if (!editName || !editRoom) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      setUpdating(true);
      const patientRef = doc(db, "patients", selectedPatient.id);
      await updateDoc(patientRef, {
        name: editName,
        room: editRoom,
      });

      Alert.alert("Success", "Patient details updated");
      setEditModalVisible(false);
      fetchData();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update patient");
    } finally {
      setUpdating(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email || "No email registered"}</Text>
        <View style={styles.badgeContainer}>
          <View style={styles.roomBadge}>
            <Text style={styles.badgeText}>Room {item.room}</Text>
          </View>
          <View style={[styles.statusBadge, item.wheelchairId ? styles.assignedBadge : styles.unassignedBadge]}>
            <Text style={styles.badgeText}>
              {item.wheelchairId ? `Wheelchair: ${item.wheelchairId}` : "No Wheelchair"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert(
              "Confirm Delete",
              `Are you sure you want to remove ${item.name}?`,
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Patients</Text>
      </View>

      <View style={styles.actionHeader}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddPatient")}
        >
          <Text style={styles.addButtonText}>+ Add New Patient</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1463ff" style={styles.loader} />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={loading}
          onRefresh={fetchData}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No patients assigned to you yet.</Text>
          }
        />
      )}

      {/* EDIT MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Patient Info</Text>
            
            <Text style={styles.label}>Patient Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Patient Name"
            />

            <Text style={styles.label}>Select Room</Text>
            <View style={styles.roomsList}>
              {rooms.map((r, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.roomOpt, editRoom === r && styles.roomOptSelected]}
                  onPress={() => setEditRoom(r)}
                >
                  <Text style={[styles.roomOptText, editRoom === r && styles.roomOptTextSelected]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleUpdatePatient}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e7f0",
  },
  backText: {
    color: "#1463ff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#162033",
  },
  actionHeader: {
    padding: 20,
  },
  addButton: {
    backgroundColor: "#1463ff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#1463ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInfo: {
    marginBottom: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  email: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  roomBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  assignedBadge: {
    backgroundColor: "#dcfce7",
  },
  unassignedBadge: {
    backgroundColor: "#fee2e2",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  editBtn: {
    backgroundColor: "#e8eefc",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnText: {
    color: "#174899",
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: "#ef4444",
    fontWeight: "600",
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 15,
    marginTop: 40,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#162033",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
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
  },
  roomsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 10,
  },
  roomOpt: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  roomOptSelected: {
    backgroundColor: "#1463ff",
    borderColor: "#1463ff",
  },
  roomOptText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 14,
  },
  roomOptTextSelected: {
    color: "#fff",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  cancelBtnText: {
    color: "#475569",
    fontWeight: "600",
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1463ff",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
