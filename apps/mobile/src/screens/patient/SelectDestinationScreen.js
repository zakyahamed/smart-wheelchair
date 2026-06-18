import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { firebase } from "../../firebase/config";

export default function SelectDestinationScreen({
  route,
  navigation,
}) {
  const { requestId } = route.params;

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebase
      .firestore()
      .collection("rooms")
      .onSnapshot(
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setRooms(data);
          setLoading(false);
        },
        (error) => {
          console.error(error);
          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  const selectRoom = async (room) => {
    try {
      await firebase
        .firestore()
        .collection("requests")
        .doc(requestId)
        .update({
          destination: {
            roomId: room.id,
            name: room.name,
            x: room.x,
            y: room.y,
          },
          status: "in_transit",
          updatedAt:
            firebase.firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert(
        "Destination Selected",
        `Going to ${room.name}`
      );

      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.roomCard}
          onPress={() => selectRoom(item)}
        >
          <Text style={styles.roomName}>
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    padding: 20,
  },

  roomCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 10,
    marginBottom: 12,
  },

  roomName: {
    fontSize: 18,
    fontWeight: "600",
  },
});