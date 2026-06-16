import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { WebView } from "react-native-webview";

export default function WebcamScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Wheelchair Camera</Text>
      <Text style={styles.subtitle}>Live webcam monitoring</Text>

      <View style={styles.card}>
        <View style={styles.cameraContainer}>
          <WebView
            source={{
              uri: "http://192.168.1.100:8080/webcam.html",
            }}
            style={styles.camera}
          />
        </View>

        <View style={styles.statusHeader}>
          <Text style={styles.statusLabel}>
            Camera Feed
          </Text>

          <Text style={styles.statusPill}>
            LIVE
          </Text>
        </View>

        <View style={styles.tripBlock}>
          <Text style={styles.detailLabel}>
            Source
          </Text>

          <Text style={styles.detailValue}>
            Wheelchair Front Camera
          </Text>

          <Text style={styles.detailLabel}>
            Status
          </Text>

          <Text style={styles.detailValue}>
            Connected
          </Text>
        </View>
      </View>
    </View>
  );
}