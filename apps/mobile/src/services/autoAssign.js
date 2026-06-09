import { firebase } from "../firebase/config";

const activeWheelchairStatuses = ["Available", "available"];

const getTime = (value) => value?.toMillis?.() || 0;

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
      status: "Assigned",
      assignedPatient: patientId,
      activeRequestId: requestRef.id,
      updatedAt: now,
    });
  }

  await batch.commit();

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
    status: "Assigned",
    assignedPatient: oldestPendingRequest.patientId,
    activeRequestId: oldestPendingRequest.id,
    updatedAt: now,
  });

  await batch.commit();

  return oldestPendingRequest.id;
}
