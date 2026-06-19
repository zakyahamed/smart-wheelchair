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
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function WheelchairManagementScreen({ navigation }) {
  const [wheelchairs, setWheelchairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "wheelchairs"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWheelchairs(list);
      setLoading(false);
    }, (error) => {
      console.error("Wheelchair fetch error:", error);
      Alert.alert("Error", "Failed to load wheelchairs");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "Available": return "#10b981";
      case "Charging": return "#f59e0b";
      case "Maintenance": return "#ef4444";
      default: return "#64748b";
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.chairId}>{item.chairId || "N/A"}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Battery</Text>
          <Text style={[styles.detailValue, { color: item.battery < 20 ? "#ef4444" : "#1e293b" }]}>
            {item.battery}%
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue}>{item.dockingLocation || "Unknown"}</Text>
        </View>
      </View>

      {item.activeRequestId && (
        <View style={styles.activeRequest}>
          <Text style={styles.requestLabel}>Active Request ID:</Text>
          <Text style={styles.requestValue}>{item.activeRequestId}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Wheelchair Fleet</Text>
      </View>

      <View style={styles.actionHeader}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddWheelchair")}
        >
          <Text style={styles.addButtonText}>+ Register New Chair</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1463ff" style={styles.loader} />
      ) : (
        <FlatList
          data={wheelchairs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No wheelchairs registered yet.</Text>
          }
        />
      )}
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  chairId: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  detailsGrid: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    gap: 20,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  activeRequest: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  requestLabel: {
    fontSize: 12,
    color: "#64748b",
    marginRight: 6,
  },
  requestValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1463ff",
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
});
