import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, firebase } from "../../firebase/config";

const statusSteps = ["pending", "assigned", "in_transit", "completed"];

const statusLabels = {
  pending: "Waiting for assignment",
  assigned: "Wheelchair assigned",
  in_transit: "Wheelchair on the way",
  completed: "Trip completed",
  cancelled: "Request cancelled",
};

const MAP_MIN_X = -2.5;
const MAP_MAX_X = 3.0;

const MAP_MIN_Y = -12.4;
const MAP_MAX_Y = 0.333;

/* ---------------- HELPERS ---------------- */

const getCoords = (loc) => {
  if (!loc) return null;

  const x = Number(loc.x ?? loc.longitude);
  const y = Number(loc.y ?? loc.latitude);

  if (isNaN(x) || isNaN(y)) return null;

  return { x, y };
};

const formatLocation = (loc) => {
  if (!loc) return "Not provided";
  if (typeof loc === "string") return loc;

  const coords = getCoords(loc);
  if (!coords) return "Invalid location";

  return `x: ${coords.x.toFixed(2)}, y: ${coords.y.toFixed(2)}`;
};

const mapToScreen = (loc) => {
  if (!loc) return null;

  const x = Number(loc.x);
  const y = Number(loc.y);

  return {
    x:
      ((x - MAP_MIN_X) /
        (MAP_MAX_X - MAP_MIN_X)) * 100,

    y:
      ((y - MAP_MIN_Y) /
        (MAP_MAX_Y - MAP_MIN_Y)) * 100,
  };
};

/* ---------------- SCREEN ---------------- */

export default function TrackWheelchairScreen({ navigation, route }) {
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [doorUpdating, setDoorUpdating] = useState(false);
  const [wheelchair, setWheelchair] = useState(null);

  const handleToggleDoor = async () => {
    if (!wheelchair?.id) return;

    try {
      setDoorUpdating(true);
      await firebase.firestore().collection("wheelchairs").doc(wheelchair.id).update({
        isOpen: !wheelchair.isOpen,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      Alert.alert("Error", err.message || "Unable to update chair state.");
    } finally {
      setDoorUpdating(false);
    }
  };

  /* ---------------- WHEELCHAIR LISTENER ---------------- */

  useEffect(() => {
    if (!request?.wheelchairId) return;

    const db = firebase.firestore();
    let unsubscribe = () => {};

    const wheelchairDocRef = db.collection("wheelchairs").doc(request.wheelchairId);

    wheelchairDocRef
      .get()
      .then((doc) => {
        if (doc.exists) {
          unsubscribe = wheelchairDocRef.onSnapshot((snapshot) => {
            setWheelchair({ id: snapshot.id, ...snapshot.data() });
          });
        } else {
          unsubscribe = db
            .collection("wheelchairs")
            .where("chairId", "==", request.wheelchairId)
            .limit(1)
            .onSnapshot((snapshot) => {
              if (snapshot.empty) {
                setWheelchair(null);
                return;
              }

              const doc = snapshot.docs[0];
              setWheelchair({ id: doc.id, ...doc.data() });
            });
        }
      })
      .catch((error) => {
        console.error("Wheelchair listener error:", error);
        setWheelchair(null);
      });

    return () => unsubscribe();
  }, [request?.wheelchairId]);

  /* ---------------- REQUEST LISTENER ---------------- */

  useEffect(() => {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      setLoading(false);
      return;
    }

    let unsubscribe;

    if (route?.params?.requestId) {
      unsubscribe = firebase
        .firestore()
        .collection("requests")
        .doc(route.params.requestId)
        .onSnapshot((doc) => {
          setRequest(doc.exists ? { id: doc.id, ...doc.data() } : null);
          setLoading(false);
        });
    } else {
      unsubscribe = firebase
        .firestore()
        .collection("requests")
        .where("patientId", "==", userId)
        .onSnapshot((snapshot) => {
          const active = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) =>
              ["pending", "assigned", "in_transit"].includes(r.status),
            )
            .sort(
              (a, b) =>
                (b.createdAt?.toMillis?.() || 0) -
                (a.createdAt?.toMillis?.() || 0),
            );

          setRequest(active[0] || null);
          setLoading(false);
        });
    }

    return () => unsubscribe && unsubscribe();
  }, [route?.params?.requestId]);

  /* ---------------- CANCEL REQUEST ---------------- */

  const handleCancel = async () => {
    if (!request?.id || request?.status === "completed") return;

    Alert.alert("Cancel request", "Do you want to cancel this request?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            setCancelling(true);

            await firebase
              .firestore()
              .collection("requests")
              .doc(request.id)
              .update({
                status: "cancelled",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              });
          } catch (err) {
            Alert.alert("Error", err.message);
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const activeStepIndex = Math.max(
    statusSteps.indexOf(request?.status || ""),
    0,
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const coords = mapToScreen(wheelchair?.location);

  /* ---------------- UI ---------------- */

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={ styles.scrollContent}
      showVerticalScrollIndicator= {false}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Track Wheelchair</Text>
      <Text style={styles.subtitle}>Live location tracking</Text>

      {!request ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No active request</Text>
          <Text style={styles.emptyText}>
            Create a request to start tracking.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {/* FLOOR PLAN */}
          <View style={styles.mapContainer}>
            <ImageBackground
              source={require("../../../assets/floor-plan.png")}
              style={styles.map}
              imageStyle={styles.floorPlanImage}
            >
              {coords ? (
                <View
                  style={[
                    styles.markerPin,
                    {
                      left: `${Math.min(Math.max(coords.x, 0), 100)}%`,
                      top: `${Math.min(Math.max(coords.y, 0), 100)}%`,
                    },
                  ]}
                />
              ) : (
                <Text style={styles.noLocationText}>Wheelchair not on map yet</Text>
              )}
            </ImageBackground>
          </View>

          {/* STATUS */}
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>
              {statusLabels[request?.status] || request?.status}
            </Text>

            <Text
              style={[
                styles.statusPill,
                styles[request?.status] || styles.pending,
              ]}
            >
              {request?.status}
            </Text>
          </View>

          {/* DETAILS */}
          <View style={styles.tripBlock}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>
              {formatLocation(wheelchair?.location)}
            </Text>

            <Text style={styles.detailLabel}>Wheelchair</Text>
            <Text style={styles.detailValue}>
              {request?.wheelchairId || "Waiting for assignment"}
            </Text>

            {['assigned', 'in_transit'].includes(request?.status) && wheelchair ? (
              <View style={styles.doorBlock}>
                <Text style={styles.detailLabel}>Chair status</Text>
                <Text style={styles.detailValue}>
                  {wheelchair.isOpen ? 'Open' : 'Closed'}
                </Text>
                <TouchableOpacity
                  disabled={doorUpdating}
                  style={[
                    styles.doorButton,
                    doorUpdating && styles.doorButtonDisabled,
                  ]}
                  onPress={handleToggleDoor}
                >
                  {doorUpdating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.doorButtonText}>
                      {wheelchair.isOpen ? 'Close Chair' : 'Open Chair'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* DESTINATION */}
          {["assigned", "in_transit"].includes(request?.status) &&
          wheelchair &&
          !wheelchair.isOpen && (
            <TouchableOpacity
              style={styles.destinationButton}
              onPress={() =>
                navigation.navigate("SelectDestination", {
                  requestId: request.id,
                })
              }
            >
              <Text style={styles.destinationButtonText}>
                Select Destination
              </Text>
            </TouchableOpacity>
          )}
          
          {/* TIMELINE */}
          {request?.status !== "cancelled" && (
            <View style={styles.timeline}>
              {statusSteps.map((step, index) => (
                <View key={step} style={styles.step}>
                  <View
                    style={[
                      styles.stepDot,
                      index <= activeStepIndex && styles.stepDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepText,
                      index <= activeStepIndex && styles.stepTextActive,
                    ]}
                  >
                    {statusLabels[step]}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {request?.status === "arrived" &&
            wheelchair &&
            !wheelchair.isOpen && (

              <TouchableOpacity
                style={styles.doorButton}
                onPress={handleToggleDoor}
              >
                <Text style={styles.doorButtonText}>
                  Open Chair
                </Text>
              </TouchableOpacity>
            )}

          {/* CANCEL */}
          {["pending", "assigned"].includes(request?.status) && (
            <TouchableOpacity
              disabled={cancelling}
              style={[
                styles.cancelButton,
                cancelling && styles.cancelButtonDisabled,
              ]}
              onPress={handleCancel}
            >
              {cancelling ? (
                <ActivityIndicator color="#991b1b" />
              ) : (
                <Text style={styles.cancelText}>Cancel Request</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  title: { fontSize: 28, fontWeight: "700", color: "#162033" },
  subtitle: { color: "#687386", marginBottom: 20 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    padding: 16,
  },

  mapContainer: {
    height: 220,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 15,
  },
  map: {
    flex: 1,
    justifyContent: "center",
  },
  floorPlanImage: {
    resizeMode: "contain",
  },
  markerPin: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#1463ff",
    borderWidth: 3,
    borderColor: "#fff",
    transform: [{ translateX: -9 }, { translateY: -9 }],
  },
  noLocationText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
  },

  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  statusLabel: { fontSize: 16, fontWeight: "700", flex: 1 },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "700",
  },

  pending: { backgroundColor: "#fff3cd", color: "#7a5800" },
  assigned: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  in_transit: { backgroundColor: "#dcfce7", color: "#166534" },
  completed: { backgroundColor: "#e5e7eb", color: "#374151" },
  cancelled: { backgroundColor: "#fee2e2", color: "#991b1b" },

  tripBlock: {
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
    paddingBottom: 10,
    marginBottom: 15,
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7b8798",
    marginTop: 10,
  },
  detailValue: { fontSize: 16, color: "#263248" },

  timeline: { marginBottom: 15 },
  step: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ccc",
    marginRight: 10,
  },
  stepDotActive: { backgroundColor: "#1463ff" },
  stepText: { color: "#7b8798" },
  stepTextActive: { color: "#162033", fontWeight: "700" },

  cancelButton: {
    backgroundColor: "#fee2e2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonDisabled: { opacity: 0.6 },
  cancelText: { color: "#991b1b", fontWeight: "700" },

  doorBlock: {
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: "#edf1f7",
    paddingTop: 12,
  },
  doorButton: {
    marginTop: 10,
    backgroundColor: "#1463ff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  doorButtonDisabled: { opacity: 0.6 },
  doorButtonText: { color: "#fff", fontWeight: "700" },

  destinationButton: {
  marginTop: 15,
  backgroundColor: "#16a34a",
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: "center",
  },

  destinationButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
