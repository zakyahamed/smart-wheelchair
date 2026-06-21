import React, { useEffect } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { db } from "../../firebase/config";

export default function WebcamScreen() {


  useEffect(() => {
    //console.log("Webcam screen mounted");

    db.collection("system")
      .doc("control")
      .set(
        { camera_active: true },
        { merge: true }
      )
      // .then(() => console.log("camera_active=true sent"))
      // .catch((err) => console.log(err));

    return () => {
      db.collection("system")
        .doc("control")
        .set(
          { camera_active: false },
          { merge: true }
        );
    };
  }, []);


  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Wheelchair Camera</Text>

      <View style={styles.cameraContainer}>
        <WebView
          source={{
            uri:
              "http://10.144.89.85:8080/stream?topic=/camera/camera/color/image_raw",
          }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    padding: 20,
    color: "#162033",
  },

  cameraContainer: {
    flex: 1,
    margin: 15,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },

  webview: {
    flex: 1,
  },
});