import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";

const WebcamViewer = () => {
  const remoteVideoRef = useRef(null);
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

  const [status, setStatus] = useState("Initializing Viewer...");

  useEffect(() => {
    let isMounted = true;
    const initViewer = async () => {
      try {
        const remoteStream = new MediaStream();
        remoteVideoRef.current.srcObject = remoteStream;

        pc.current.ontrack = (event) => {
          if (isMounted) {
            event.streams[0].getTracks().forEach((track) => {
              remoteStream.addTrack(track);
            });
          }
        };

        const callDoc = doc(db, "webcam_sessions", "laptop_stream");
        const offerCandidates = collection(callDoc, "offerCandidates");
        const answerCandidates = collection(callDoc, "answerCandidates");

        // Clear previous session data
        if (isMounted) {
          await setDoc(callDoc, {});
          const oSnapshot = await getDocs(offerCandidates);
          oSnapshot.forEach((d) => deleteDoc(d.ref));
          const aSnapshot = await getDocs(answerCandidates);
          aSnapshot.forEach((d) => deleteDoc(d.ref));
        }

        // Push local ICE candidates
        pc.current.onicecandidate = (event) => {
          if (event.candidate && isMounted && pc.current.signalingState !== "closed") {
            addDoc(offerCandidates, event.candidate.toJSON());
          }
        };

        // Create Offer
        const offerDescription = await pc.current.createOffer();
        if (!isMounted || pc.current.signalingState === "closed") return;
        await pc.current.setLocalDescription(offerDescription);

        const offer = {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        };

        await setDoc(callDoc, { offer });

        // Listen for Answer
        const unsubCall = onSnapshot(callDoc, (snapshot) => {
          if (!isMounted || pc.current.signalingState === "closed") return;
          const data = snapshot.data();
          if (!pc.current.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.current.setRemoteDescription(answerDescription);
            setStatus("Connected!");
          }
        });

        // Handle ICE candidates from remote
        const unsubAnswer = onSnapshot(answerCandidates, (snapshot) => {
          if (!isMounted || pc.current.signalingState === "closed") return;
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              pc.current.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });

        pc.current.onconnectionstatechange = () => {
          if (isMounted) {
            setStatus(`Connection state: ${pc.current.connectionState}`);
          }
        };

        setStatus("Creating offer, waiting for laptop...");
      } catch (err) {
        if (isMounted) {
          console.error("Error initializing viewer:", err);
          setStatus(`Error: ${err.message}`);
        }
      }
    };

    initViewer();

    return () => {
      isMounted = false;
      if (pc.current) {
        pc.current.close();
      }
    };
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        padding: 10,
        backgroundColor: "#000",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <h3>Webcam Viewer (Mobile)</h3>
      <p style={{ fontSize: 12 }}>Status: {status}</p>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "auto",
          maxHeight: "80vh",
          backgroundColor: "#222",
        }}
      />
    </div>
  );
};

export default WebcamViewer;
