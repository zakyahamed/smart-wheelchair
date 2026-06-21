import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, firebase } from "../../firebase/config";
import RequestWheelchairButton from "../../components/RequestWheelchairButton";

const formatDate = (value) => {
  if (!value?.toDate) return "Pending";

  try {
    return value.toDate().toLocaleString();
  } catch {
    return "Pending";
  }
};

const formatLocation = (location) => {
  if (!location) return "No location";

  if (typeof location === "string") return location;

  if (location.latitude && location.longitude) {
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }

  return "Invalid location";
};

export default function HistoryScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestRequest, setLatestRequest] = useState(null);
  const [caregiverPhone, setCaregiverPhone] = useState(null);
  const [caregiverName, setCaregiverName] = useState(null);

  useEffect(() => {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = firebase
      .firestore()
      .collection("requests")
      .where("patientId", "==", userId)
      .onSnapshot(
        (snapshot) => {
          const items = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .sort((a, b) => {
              const first = a.createdAt?.toMillis?.() || 0;
              const second = b.createdAt?.toMillis?.() || 0;
              return second - first;
            });

          setRequests(items);

          // get latest active request
          const active = items.find((r) =>
            [
              "pending",
              "assigned",
              "pickup_in_transit",
              "pickup_arrived",
              "destination_in_transit",
              "destination_arrived",
            ].includes(r.status),
          );

          setLatestRequest(active || null);

          setLoading(false);
        },
        (error) => {
          console.log("History fetch error:", error);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const fetchCaregiverContact = async () => {
      try {
        const patientSnapshot = await firebase
          .firestore()
          .collection("patients")
          .where("uid", "==", userId)
          .limit(1)
          .get();

        if (patientSnapshot.empty) return;

        const patientData = patientSnapshot.docs[0].data();
        const caregiverId = patientData?.caregiverId;
        if (!caregiverId) return;

        const caregiverDoc = await firebase
          .firestore()
          .collection("caregivers")
          .doc(caregiverId)
          .get();

        if (!caregiverDoc.exists) return;

        const caregiverData = caregiverDoc.data();
        setCaregiverPhone(caregiverData?.phone || null);
        setCaregiverName(caregiverData?.email || caregiverData?.uid || null);
      } catch (err) {
        console.log("Caregiver lookup error:", err);
      }
    };

    fetchCaregiverContact();
  }, []);

  const handleCallCaregiver = async () => {
    if (!caregiverPhone) {
      const message = caregiverName
        ? `Caregiver ${caregiverName} has no phone number configured.`
        : "No caregiver assigned or phone number available.";
      Alert.alert("Call unavailable", message);
      return;
    }

    const url = `tel:${caregiverPhone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Unable to call", "Phone calls are not supported on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Call failed", err.message || "Unable to place the call.");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  const renderRequest = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("Track", { requestId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{formatLocation(item.location)}</Text>

        <Text style={[styles.status, styles[item.status] || styles.pending]}>
          {item.status || "pending"}
        </Text>
      </View>

      <Text style={styles.detail}>
        Wheelchair: {item.wheelchairId || "Not assigned"}
      </Text>

      <Text style={styles.detail}>
        Location: {formatLocation(item.location)}
      </Text>

      <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Requests</Text>
          <Text style={styles.subtitle}>
            Request and track your wheelchair rides
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        {/* Inline request button — opens a modal for one-tap requests */}
        <RequestWheelchairButton style={styles.primaryButton} navigation={navigation} />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            if (latestRequest) {
              navigation.navigate("Track", {
                requestId: latestRequest.id,
              });
            } else {
              navigation.navigate("Track");
            }
          }}
        >
          <Text style={styles.secondaryButtonText}>Track Active Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Webcam")}
        >
          <Text style={styles.secondaryButtonText}>View Live Webcam</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleCallCaregiver}
        >
          <Text style={styles.secondaryButtonText}>Call Caregiver</Text>
        </TouchableOpacity>
      </View>

      {/* HISTORY */}
      <Text style={styles.sectionTitle}>Request History</Text>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={
            requests.length ? styles.list : styles.emptyList
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No wheelchair requests yet.</Text>
          }
        />
      )}
    </View>
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
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    color: "#162033",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#687386",
    marginTop: 4,
  },
  logoutButton: {
    borderColor: "#d4dae5",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: "#3d4b63",
    fontWeight: "600",
  },
  actions: {
    gap: 10,
    marginBottom: 24,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1463ff",
    borderRadius: 8,
    padding: 15,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#e8eefc",
    borderRadius: 8,
    padding: 15,
  },
  secondaryButtonText: {
    color: "#174899",
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#162033",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyText: {
    color: "#687386",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderColor: "#e2e7f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    color: "#162033",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  status: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "capitalize",
  },
  pending: {
    backgroundColor: "#fff3cd",
    color: "#7a5800",
  },
  assigned: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  in_transit: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  pickup_in_transit: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  pickup_arrived: {
    backgroundColor: "#ede9fe",
    color: "#6d28d9",
  },
  destination_in_transit: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  destination_arrived: {
    backgroundColor: "#d1fae5",
    color: "#047857",
  },
  completed: {
    backgroundColor: "#e5e7eb",
    color: "#374151",
  },
  cancelled: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  detail: {
    color: "#3d4b63",
    marginTop: 2,
  },
  date: {
    color: "#7b8798",
    fontSize: 12,
    marginTop: 10,
  },
});
