import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { rtdb } from "../../firebase/config";

export default function PatientHealthScreen() {
  const [heartRate, setHeartRate] = useState("--");
  const [spo2, setSpo2] = useState("--");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const vitalsRef = rtdb.ref("/patient_data");

    vitalsRef.on("value", (snapshot) => {
      const data = snapshot.val();

      if (data) {
        setHeartRate(data.heart_rate);
        setSpo2(data.spo2);
      }
    });


    // History values
    const logsRef = rtdb.ref("/health_logs");

    logsRef.on("value", (snapshot) => {
        const data = snapshot.val();

        if (data) {
        const logs = Object.values(data);
        setHistory(logs);
        }
    });


    return () => {
      vitalsRef.off();
      logsRef.off();
    };
  }, []);


    const validHistory = history.filter(
    item =>
        item &&
        item.heart_rate !== undefined &&
        item.heart_rate !== null &&
        !isNaN(Number(item.heart_rate))
    );

    const chartData = {
    labels: validHistory.map((_, i) => `${i + 1}`),
    datasets: [
        {
        data: validHistory.map(item =>
            Number(item.heart_rate)
        ),
        },
    ],
    };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient Health Monitor</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Heart Rate</Text>
        <Text style={styles.value}>
          ❤️ {heartRate} BPM
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>SpO₂</Text>
        <Text style={styles.value}>
          🩸 {spo2} %
        </Text>
      </View>

    {validHistory.length > 0 ? (
    <LineChart
        data={chartData}
        width={350}
        height={220}
        chartConfig={{
        backgroundColor: "#1E2923",
        backgroundGradientFrom: "#08130D",
        backgroundGradientTo: "#1E2923",
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(26,255,146,${opacity})`,
        labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
        strokeWidth: 2,
        }}
        bezier
    />
    ) : (
    <Text>No health history available</Text>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f6f8fb",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: "#666",
  },
  value: {
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 10,
  },
});