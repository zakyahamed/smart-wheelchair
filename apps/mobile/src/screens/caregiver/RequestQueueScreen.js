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
import { assignOldestPendingRequestToWheelchair } from "../../services/autoAssign";

const activeStatuses = ["pending", "assigned", "in_transit"];

const statusLabels = {
  pending: "Pending",
  assigned: "Assigned",
  in_transit: "In Transit",
  completed: "Completed",
  cancelled: "Cancelled",
};

const formatLocation = (location) => {
  if (!location) return "No location";

  if (typeof location === "string") return location;

  if (location.latitude && location.longitude) {
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }

  return "Invalid location";
};

export default function RequestQueueScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [wheelchairs, setWheelchairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const unsubscribeRequests = firebase
      .firestore()
      .collection("requests")
      .onSnapshot(
        (snapshot) => {
          const list = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((request) => activeStatuses.includes(request.status))
            .sort((a, b) => {
              const first = a.createdAt?.toMillis?.() || 0;
              const second = b.createdAt?.toMillis?.() || 0;
              return second - first;
            });

          setRequests(list);
          setLoading(false);
        },
        (error) => {
          console.log("Request queue error:", error);
          setLoading(false);
        },
      );

    const unsubscribeWheelchairs = firebase
      .firestore()
      .collection("wheelchairs")
      .onSnapshot(
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setWheelchairs(list);
        },
        (error) => {
          console.log("Wheelchair list error:", error);
        },
      );

    return () => {
      unsubscribeRequests();
      unsubscribeWheelchairs();
    };
  }, []);

  const updateRequestStatus = async (request, status) => {
    try {
      setUpdatingId(request.id);

      await firebase.firestore().collection("requests").doc(request.id).update({
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.log("Status update error:", error);
      Alert.alert("Update failed", error.message || "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const completeRequest = async (request) => {
    let freedWheelchairId = null;

    try {
      setUpdatingId(request.id);

      const batch = firebase.firestore().batch();
      const requestRef = firebase
        .firestore()
        .collection("requests")
        .doc(request.id);

      const assignedChair = wheelchairs.find(
        (chair) =>
          chair.activeRequestId === request.id ||
          chair.id === request.wheelchairId,
      );

      batch.update(requestRef, {
        status: "completed",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      if (assignedChair) {
        freedWheelchairId = assignedChair.id;

        batch.update(
          firebase.firestore().collection("wheelchairs").doc(assignedChair.id),
          {
            status: "Available",
            assignedPatient: null,
            activeRequestId: null,
            location: assignedChair.dockingPosition || assignedChair.location,
            isOpen: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
        );
      }

      await batch.commit();

      if (freedWheelchairId) {
        await assignOldestPendingRequestToWheelchair(freedWheelchairId);
      }
    } catch (error) {
      console.log("Complete request error:", error);
      Alert.alert("Completion failed", error.message || "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const renderRequest = ({ item }) => {
    const isUpdating = updatingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{formatLocation(item.location)}</Text>

          <Text style={[styles.statusPill, styles[item.status]]}>
            {statusLabels[item.status] || item.status}
          </Text>
        </View>

        <Text style={styles.detail}>
          Patient: {item.patientEmail || item.patientId}
        </Text>

        <Text style={styles.detail}>
          Wheelchair: {item.wheelchairLabel || item.wheelchairId || "Not assigned"}
        </Text>

        <Text style={styles.detail}>
          Location: {formatLocation(item.location)}
        </Text>

        {item.notes ? (
          <Text style={styles.notes}>Notes: {item.notes}</Text>
        ) : null}

        {isUpdating ? (
          <ActivityIndicator style={styles.cardLoader} />
        ) : (
          <View style={styles.actions}>
            {item.status === "pending" && (
              <View style={styles.waitingBadge}>
                <Text style={styles.waitingBadgeText}>
                  Waiting for wheelchair
                </Text>
              </View>
            )}

            {item.status === "assigned" && (
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => updateRequestStatus(item, "in_transit")}
              >
                <Text style={styles.primaryActionText}>Start Trip</Text>
              </TouchableOpacity>
            )}

            {item.status === "in_transit" && (
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={() => completeRequest(item)}
              >
                <Text style={styles.primaryActionText}>Complete</Text>
              </TouchableOpacity>
            )}

            {["pending", "assigned"].includes(item.status) && (
              <TouchableOpacity
                style={styles.cancelAction}
                onPress={() => updateRequestStatus(item, "cancelled")}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Request Queue</Text>
      <Text style={styles.subtitle}>
        Assign wheelchairs and manage live requests
      </Text>

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
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No active requests</Text>
              <Text style={styles.emptyText}>
                New requests will appear here.
              </Text>
            </View>
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
  backText: {
    color: "#1463ff",
    fontWeight: "700",
    marginBottom: 18,
  },
  title: {
    color: "#162033",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#687386",
    marginBottom: 22,
    marginTop: 6,
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
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e2e7f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: "#162033",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: "#687386",
    marginTop: 8,
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
  statusPill: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  detail: {
    color: "#3d4b63",
    marginTop: 3,
  },
  notes: {
    color: "#687386",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: "#1463ff",
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  primaryActionText: {
    color: "#fff",
    fontWeight: "700",
  },
  waitingBadge: {
    alignItems: "center",
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  waitingBadgeText: {
    color: "#7a5800",
    fontWeight: "700",
  },
  cancelAction: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
  },
  cancelActionText: {
    color: "#991b1b",
    fontWeight: "700",
  },
  cardLoader: {
    marginTop: 14,
  },
});
