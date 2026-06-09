import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, firebase } from "../../firebase/config";

export default function CaregiverDashboardScreen({ navigation }) {
  const [counts, setCounts] = useState({
    requests: 0,
    patients: 0,
    wheelchairs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCounts = async () => {
      try {
        const [requests, patients, wheelchairs] = await Promise.all([
          firebase
            .firestore()
            .collection("requests")
            .where("status", "in", ["pending", "assigned", "in_transit"])
            .get(),
          firebase
            .firestore()
            .collection("patients")
            .where("caregiverId", "==", auth.currentUser?.uid)
            .get(),
          firebase
            .firestore()
            .collection("wheelchairs")
            .where("status", "==", "Available")
            .get(),
        ]);

        if (isMounted) {
          setCounts({
            requests: requests.size,
            patients: patients.size,
            wheelchairs: wheelchairs.size,
          });
        }
      } catch (error) {
        console.log("Dashboard count error:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const unsubscribe = navigation.addListener("focus", loadCounts);
    loadCounts();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Caregiver Home</Text>
          <Text style={styles.subtitle}>Manage requests, patients, and wheelchairs</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.requests}</Text>
            <Text style={styles.statLabel}>Active Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.wheelchairs}</Text>
            <Text style={styles.statLabel}>Available Chairs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.patients}</Text>
            <Text style={styles.statLabel}>My Patients</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Requests")}
        >
          <Text style={styles.primaryButtonText}>Request Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Patients")}
        >
          <Text style={styles.secondaryButtonText}>Manage Patients</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("AddWheelchair")}
        >
          <Text style={styles.secondaryButtonText}>Add Wheelchair</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 22,
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
  loader: {
    marginVertical: 24,
  },
  stats: {
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#fff",
    borderColor: "#e2e7f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  statValue: {
    color: "#1463ff",
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    color: "#687386",
    fontWeight: "600",
    marginTop: 4,
  },
  actions: {
    gap: 10,
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
});
