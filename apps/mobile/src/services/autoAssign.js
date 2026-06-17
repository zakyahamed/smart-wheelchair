import { firebase } from "../firebase/config";
import { getRoomCoordinates } from "./roomService";

const activeWheelchairStatuses = ["Available", "available"];

const getTime = (value) => value?.toMillis?.() || 0;

const getLocationCoords = (location) => {
  if (!location) return null;
  if (location.x !== undefined && location.y !== undefined) {
    return { x: location.x, y: location.y };
  }
  return null;
};

const getLocationCoordsAsync = async (location) => {
  if (!location) return null;
  if (typeof location === "string") {
    return await getRoomCoordinates(location);
  }
  if (location.x !== undefined && location.y !== undefined) {
    return { x: location.x, y: location.y };
  }
  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const interpolateLocation = (start, end, t) => ({
  x: start.x + (end.x - start.x) * t,
  y: start.y + (end.y - start.y) * t,
});

export async function moveWheelchairToLocation(
  wheelchairId,
  destination,
  options = {},
) {
  const db = firebase.firestore();
  const destinationCoords = getLocationCoords(destination);
  if (!wheelchairId || !destinationCoords) return null;

  const wheelchairDoc = await db.collection("wheelchairs").doc(wheelchairId).get();
  if (!wheelchairDoc.exists) return null;

  const wheelchair = { id: wheelchairDoc.id, ...wheelchairDoc.data() };
  const startCoords = getLocationCoords(wheelchair.location);
  if (!startCoords) return null;
  if (startCoords.x === destinationCoords.x && startCoords.y === destinationCoords.y) {
    return null;
  }

  const steps = options.steps ?? 12;
  const interval = options.interval ?? 400;
  const requestRef = wheelchair.activeRequestId
    ? db.collection("requests").doc(wheelchair.activeRequestId)
    : null;

  if (requestRef) {
    await requestRef.update({
      status: "in_transit",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (let step = 1; step <= steps; step += 1) {
    const nextLocation = interpolateLocation(startCoords, destinationCoords, step / steps);

    await db.collection("wheelchairs").doc(wheelchairId).update({
      location: nextLocation,
      status: "In Transit",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    if (step < steps) {
      await sleep(interval);
    }
  }

  return true;
};

export async function createRequestWithAutoAssignment({
  patientId,
  patientEmail,
  location,
  notes,
}) {
  const db = firebase.firestore();
  const requestRef = db.collection("requests").doc();
  const now = firebase.firestore.FieldValue.serverTimestamp();

  const availableSnapshot = await db.collection("wheelchairs").get();
  const availableWheelchair = availableSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .find((wheelchair) => activeWheelchairStatuses.includes(wheelchair.status));

  const targetCoords = await getLocationCoordsAsync(location);

  const requestData = {
    patientId,
    patientEmail,
    location,
    notes,
    status: availableWheelchair ? "assigned" : "pending",
    wheelchairId: availableWheelchair ? availableWheelchair.id : null,
    wheelchairLabel: availableWheelchair
      ? availableWheelchair.chairId || availableWheelchair.id
      : null,
    queueStatus: availableWheelchair ? "assigned" : "waiting",
    createdAt: now,
    updatedAt: now,
  };

  const batch = db.batch();
  batch.set(requestRef, requestData);

  if (availableWheelchair) {
    batch.update(db.collection("wheelchairs").doc(availableWheelchair.id), {
      status: "In Transit",
      assignedPatient: patientId,
      activeRequestId: requestRef.id,
      location: targetCoords || availableWheelchair.location,
      updatedAt: now,
    });
  }

  await batch.commit();

  if (availableWheelchair) {
    void moveWheelchairToLocation(availableWheelchair.id, targetCoords || location);
    void moveWheelchairToLocation(availableWheelchair.id, targetCoords);
  }

  return {
    id: requestRef.id,
    assignedWheelchairId: requestData.wheelchairId,
    assignedWheelchairLabel: requestData.wheelchairLabel,
    status: requestData.status,
  };
}

export async function assignOldestPendingRequestToWheelchair(wheelchairId) {
  const db = firebase.firestore();
  const wheelchairRef = db.collection("wheelchairs").doc(wheelchairId);
  const wheelchairDoc = await wheelchairRef.get();

  if (!wheelchairDoc.exists) {
    return null;
  }

  const wheelchair = { id: wheelchairDoc.id, ...wheelchairDoc.data() };

  if (!activeWheelchairStatuses.includes(wheelchair.status)) {
    return null;
  }

  const pendingSnapshot = await db
    .collection("requests")
    .where("status", "==", "pending")
    .get();

  const oldestPendingRequest = pendingSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt))[0];

  if (!oldestPendingRequest) {
    return null;
  }

  const targetCoords = await getLocationCoordsAsync(oldestPendingRequest.location);
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.update(db.collection("requests").doc(oldestPendingRequest.id), {
    status: "assigned",
    wheelchairId: wheelchair.id,
    wheelchairLabel: wheelchair.chairId || wheelchair.id,
    queueStatus: "assigned",
    updatedAt: now,
  });

  batch.update(wheelchairRef, {
    status: "In Transit",
    assignedPatient: oldestPendingRequest.patientId,
    activeRequestId: oldestPendingRequest.id,
    location: targetCoords || wheelchair.location,
    updatedAt: now,
  });

  await batch.commit();

  const targetLocation = targetCoords || oldestPendingRequest.location;
  void moveWheelchairToLocation(wheelchair.id, targetLocation);

  return oldestPendingRequest.id;
}
