import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { db } from "../../firebase/config";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBDLXzbP4JLUySumSFLXUcbH1ymLkYa12M",
  authDomain: "smart-wheelchair-a4ced.firebaseapp.com",
  projectId: "smart-wheelchair-a4ced",
  storageBucket: "smart-wheelchair-a4ced.firebasestorage.app",
  messagingSenderId: "619539536168",
  appId: "1:619539536168:web:1e8527b8dc8ab91a24181d",
  measurementId: "G-X4MMC8BSJ7"
};

const VIEWER_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
        body { margin: 0; padding: 0; background: #000; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
        video { width: 100%; height: 100%; object-fit: contain; background: #222; }
        .status { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); padding: 6px 12px; border-radius: 6px; font-size: 12px; z-index: 10; font-family: monospace; }
        #debug { position: absolute; bottom: 10px; left: 10px; font-size: 10px; color: #aaa; z-index: 10; }
    </style>
</head>
<body>
    <div class="status" id="status">Initializing Viewer...</div>
    <div id="debug"></div>
    <video id="remoteVideo" autoplay playsinline muted></video>

    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

    <script>
        const setStatus = (msg) => {
            console.log("[Viewer] " + msg);
            document.getElementById('status').innerText = msg;
        };

        const setDebug = (msg) => {
            const d = document.getElementById('debug');
            d.innerHTML += msg + "<br/>";
        };
        
        async function start() {
            const video = document.getElementById('remoteVideo');
            
            video.onplay = () => setStatus("Video playing");
            video.onerror = (e) => setDebug("Video Error: " + video.error.code);

            try {
                firebase.initializeApp(${JSON.stringify(FIREBASE_CONFIG)});
                const db = firebase.firestore();
                const callDoc = db.collection('webcam_sessions').doc('laptop_stream');
                
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
                });

                const remoteCandidatesBuffer = [];

                pc.ontrack = (event) => {
                    setStatus("Media stream received!");
                    const stream = event.streams[0];
                    setDebug("Tracks: " + stream.getTracks().length);
                    
                    if (video.srcObject !== stream) {
                        video.srcObject = stream;
                        console.log("Stream attached to video element");
                        
                        // Explicitly call play for some mobile browsers
                        video.play().catch(e => {
                            setDebug("Play Error: " + e.message);
                            // If autoplay fails, it might need a user interaction, 
                            // but WebView with mediaPlaybackRequiresUserAction={false} should be fine.
                        });
                    }
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        callDoc.collection('offerCandidates').add(event.candidate.toJSON());
                    }
                };

                pc.onconnectionstatechange = () => {
                    setStatus("Connection: " + pc.connectionState);
                    if (pc.connectionState === 'connected') {
                        // Keep status visible for a bit to confirm connection
                        setTimeout(() => {
                            // document.getElementById('status').style.display = 'none';
                        }, 2000);
                    }
                };

                // 1. Clear previous session data
                setStatus("Cleaning session...");
                const oSnapshot = await callDoc.collection('offerCandidates').get();
                for (const doc of oSnapshot.docs) await doc.ref.delete();
                const aSnapshot = await callDoc.collection('answerCandidates').get();
                for (const doc of aSnapshot.docs) await doc.ref.delete();
                
                await callDoc.update({
                    offer: firebase.firestore.FieldValue.delete(),
                    answer: firebase.firestore.FieldValue.delete()
                }).catch(e => console.log("Cleanup update skipped"));

                // 2. Wait for laptop
                setStatus("Waiting for laptop...");
                await new Promise(r => setTimeout(r, 2000));

                // 3. Create Offer
                setStatus("Creating offer...");
                pc.addTransceiver('video', { direction: 'recvonly' });
                
                const offerDescription = await pc.createOffer();
                await pc.setLocalDescription(offerDescription);

                await callDoc.set({ 
                    offer: { sdp: offerDescription.sdp, type: offerDescription.type },
                    active: true 
                }, { merge: true });

                // 4. Listen for Answer
                callDoc.onSnapshot((snapshot) => {
                    const data = snapshot.data();
                    if (!pc.remoteDescription && data && data.answer) {
                        setStatus("Answer received, connecting...");
                        pc.setRemoteDescription(new RTCSessionDescription(data.answer)).then(() => {
                            remoteCandidatesBuffer.forEach(can => pc.addIceCandidate(can).catch(e => console.error(e)));
                            remoteCandidatesBuffer.length = 0;
                        });
                    }
                });

                // 5. Listen for Remote ICE Candidates
                callDoc.collection('answerCandidates').onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const candidate = new RTCIceCandidate(change.doc.data());
                            if (pc.remoteDescription) {
                                pc.addIceCandidate(candidate).catch(e => console.error(e));
                            } else {
                                remoteCandidatesBuffer.push(candidate);
                            }
                        }
                    });
                });

            } catch (e) {
                setStatus("Fatal Error: " + e.message);
                setDebug(e.stack);
            }
        }

        start();
    </script>
</body>
</html>
`;

export default function WebcamViewerScreen({ navigation }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleStream = async (active) => {
    setLoading(true);
    try {
      await db.collection("webcam_sessions").doc("laptop_stream").set(
        { active: active },
        { merge: true }
      );
      setIsStreaming(active);
    } catch (error) {
      console.error("Error toggling stream:", error);
      alert("Failed to control laptop camera. Check Firebase connection.");
    }
    setLoading(false);
  };

  if (isStreaming) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => toggleStream(false)}>
            <Text style={styles.backText}>← Stop & Go Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Live View</Text>
        </View>

        <WebView
          source={{ html: VIEWER_HTML }}
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          onPermissionRequest={(event) => {
            event.request.grant(event.request.resources);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Webcam Control</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Laptop Camera Remote</Text>
        <Text style={styles.info}>
          You can now start and stop the laptop's camera directly from this app. 
          Make sure the "Laptop Streamer" page is open on your laptop.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status:</Text>
          <Text style={[styles.statusValue, { color: isStreaming ? "#10b981" : "#ef4444" }]}>
            {isStreaming ? "Streaming Active" : "Camera Offline"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isStreaming ? styles.buttonStop : styles.buttonStart]}
          onPress={() => toggleStream(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Start Laptop Camera
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Instructions:</Text>
          <Text style={styles.step}>1. Open 'laptop_streamer.html' on your laptop browser.</Text>
          <Text style={styles.step}>2. Tap 'Start Laptop Camera' above.</Text>
          <Text style={styles.step}>3. The stream will automatically appear here.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e7f0",
    backgroundColor: "#fff",
  },
  backText: {
    color: "#1463ff",
    fontWeight: "700",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#162033",
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#3d4b63",
  },
  info: {
    fontSize: 14,
    color: "#687386",
    marginBottom: 24,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e7f0",
    marginBottom: 24,
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  button: {
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    shadowColor: "#1463ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonStart: {
    backgroundColor: "#1463ff",
  },
  buttonStop: {
    backgroundColor: "#ef4444",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  instructions: {
    marginTop: 32,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e7f0",
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  step: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 10,
    lineHeight: 20,
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
});
