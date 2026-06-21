import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";

import { firebase } from "../firebase/config";
import { moveAssignedWheelchairToDestination } from "../services/autoAssign";

export default function DestinationSelector({
  requestId,
  visible,
  onClose,
}) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const unsubscribe = firebase
      .firestore()
      .collection("rooms")
      .onSnapshot((snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRooms(data);
      });

    return unsubscribe;
  }, [visible]);

  const handleConfirm = async () => {
    if (!selectedRoom) {
      Alert.alert("Select Destination", "Please choose a room.");
      return;
    }

    try {
      setLoading(true);

      await firebase
        .firestore()
        .collection("requests")
        .doc(requestId)
        .update({
          destination: {
            roomId: selectedRoom.id,
            name: selectedRoom.name,
            x: selectedRoom.x,
            y: selectedRoom.y,
          },
          updatedAt:
            firebase.firestore.FieldValue.serverTimestamp(),
        });

      await moveAssignedWheelchairToDestination(requestId, {
        x: selectedRoom.x,
        y: selectedRoom.y,
      });

      Alert.alert(
        "Destination Selected",
        `Going to ${selectedRoom.name}`
      );

      onClose();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Select Destination</Text>

          <View style={styles.options}>
            {rooms.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.option,
                  selectedRoom?.id === room.id &&
                    styles.optionActive,
                ]}
                onPress={() => setSelectedRoom(room)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedRoom?.id === room.id &&
                      styles.optionTextActive,
                  ]}
                >
                  {room.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.primary}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Go</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancel}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionActive: {
    borderColor: "#1463ff",
    backgroundColor: "#e7f0ff",
  },
  optionText: {
    fontWeight: "600",
  },
  optionTextActive: {
    color: "#1463ff",
  },
  row: {
    flexDirection: "row",
    marginTop: 20,
  },
  primary: {
    flex: 1,
    backgroundColor: "#1463ff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  cancel: {
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  cancelText: {
    color: "#1463ff",
    fontWeight: "700",
  },
});