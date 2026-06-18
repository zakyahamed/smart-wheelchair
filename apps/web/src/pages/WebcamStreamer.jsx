import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  setDoc,
} from "firebase/firestore";

const WebcamStreamer = () => {
  const localVideoRef = useRef(null);
  const pc = useRef(
    new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
          ],
        },
      ],
    })
  );

  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    let isMounted = true;
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => {
          if (pc.current.signalingState !== "closed") {
            pc.current.addTrack(track, stream);
          }
        });
        setStatus("Waiting for connection...");

        // Reference to the shared signaling document
        const callDoc = doc(db, "webcam_sessions", "laptop_stream");

        // Listen for remote offer
        const unsubCall = onSnapshot(callDoc, async (snapshot) => {
          if (!isMounted || pc.current.signalingState === "closed") return;
          const data = snapshot.data();
          if (!pc.current.currentRemoteDescription && data?.offer) {
            const offerDescription = new RTCSessionDescription(data.offer);
            await pc.current.setRemoteDescription(offerDescription);

            const answerDescription = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answerDescription);

            const answer = {
              type: answerDescription.type,
              sdp: answerDescription.sdp,
            };

            await updateDoc(callDoc, { answer });
          }
        });

        // Handle ICE candidates from remote
        const offerCandidates = collection(callDoc, "offerCandidates");
        const unsubOffer = onSnapshot(offerCandidates, (snapshot) => {
          if (!isMounted || pc.current.signalingState === "closed") return;
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              pc.current.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });

        // Push local ICE candidates
        const answerCandidates = collection(callDoc, "answerCandidates");
        pc.current.onicecandidate = (event) => {
          if (event.candidate && isMounted && pc.current.signalingState !== "closed") {
            addDoc(answerCandidates, event.candidate.toJSON());
          }
        };

        pc.current.onconnectionstatechange = () => {
          if (isMounted) {
            setStatus(`Connection state: ${pc.current.connectionState}`);
          }
        };
      } catch (err) {
        if (isMounted) {
          console.error("Error starting stream:", err);
          setStatus(`Error: ${err.message}`);
        }
      }
    };

    startStream();

    return () => {
      isMounted = false;
      if (pc.current) {
        pc.current.close();
      }
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>Webcam Streamer (Laptop)</h2>
      <p>Status: {status}</p>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          maxWidth: 600,
          border: "2px solid #333",
          borderRadius: 8,
        }}
      />
    </div>
  );
};

export default WebcamStreamer;
