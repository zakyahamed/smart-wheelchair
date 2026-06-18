import { firebase } from "../firebase/config";

const FLOOR_PLAN_DOC = "floorPlan/locations";

export async function getRoomCoordinates(roomName) {
  try {
    const db = firebase.firestore();
    const doc = await db.doc(FLOOR_PLAN_DOC).get();

    if (!doc.exists) {
      console.warn("Floor plan document not found in Firestore");
      return null;
    }

    const rooms = doc.data().rooms || {};
    return rooms[roomName] || null;
  } catch (error) {
    console.error("Error fetching room coordinates:", error);
    return null;
  }
}

export async function getAllRooms() {
  try {
    const db = firebase.firestore();
    const doc = await db.doc(FLOOR_PLAN_DOC).get();

    if (!doc.exists) {
      console.warn("Floor plan document not found in Firestore");
      return {};
    }

    return doc.data().rooms || {};
  } catch (error) {
    console.error("Error fetching all rooms:", error);
    return {};
  }
}

export async function initializeFloorPlan() {
  try {
    const db = firebase.firestore();
    const docRef = db.doc(FLOOR_PLAN_DOC);
    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        rooms: {
          "Toilet": { x: 0.25, y: 0.65 },
          "Room 1": { x: 0.25, y: 0.25 },
          "Room 2": { x: 0.55, y: 0.25 },
          "Room 3": { x: 0.85, y: 0.25 },
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Floor plan initialized in Firestore");
    }
  } catch (error) {
    console.error("Error initializing floor plan:", error);
  }
}
