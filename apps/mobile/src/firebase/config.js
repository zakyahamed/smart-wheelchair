import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDLXzbP4JLUySumSFLXUcbH1ymLkYa12M",
  authDomain: "smart-wheelchair-a4ced.firebaseapp.com",
  projectId: "smart-wheelchair-a4ced",
  storageBucket: "smart-wheelchair-a4ced.firebasestorage.app",
  messagingSenderId: "619539536168",
  appId: "1:619539536168:web:1e8527b8dc8ab91a24181d",
  measurementId: "G-X4MMC8BSJ7",
};

// Initialize Firebase (prevent duplicate init in Expo hot reload)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Services
const auth = firebase.auth();
const db = firebase.firestore();

export { auth, db, firebase };
