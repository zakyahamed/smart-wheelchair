import { firebase } from "../firebase/config";
import { getRoomCoordinates } from "./roomService";

const activeWheelchairStatuses = ["Available", "available"];

const getTime = (value) => value?.toMillis?.() || 0;

const getLocationCoords = (location) => {
  if (!location) return null;
  if (location.x !== undefined && location.y !== undefined) {
    const x = Number(location.x);
    const y = Number(location.y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }
  return null;
};

const getLocationCoordsAsync = async (location) => {
  if (!location) return null;
  if (typeof location === "string") {
    return await getRoomCoordinates(location);
  }
  return getLocationCoords(location);
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

  const steps = options.steps ?? 12;
  const interval = options.interval ?? 400;
  const requestTransitStatus = options.requestTransitStatus;
  const requestArrivalStatus = options.requestArrivalStatus;
  const wheelchairTransitStatus = options.wheelchairTransitStatus || "In Transit";
  const wheelchairArrivalStatus = options.wheelchairArrivalStatus || "Arrived";
  const requestRef = wheelchair.activeRequestId
    ? db.collection("requests").doc(wheelchair.activeRequestId)
    : null;

  if (requestRef && requestTransitStatus) {
    await requestRef.update({
      status: requestTransitStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  const isAlreadyAtDestination =
    startCoords.x === destinationCoords.x && startCoords.y === destinationCoords.y;

  if (!isAlreadyAtDestination) {
    for (let step = 1; step <= steps; step += 1) {
      if (requestRef) {
        const activeRequest = await requestRef.get();
        if (!activeRequest.exists || activeRequest.data()?.status === "cancelled") {
          return false;
        }
      }

      // const nextLocation = interpolateLocation(startCoords, destinationCoords, step / steps);

      // await db.collection("wheelchairs").doc(wheelchairId).update({
      //   location: nextLocation,
      //   status: wheelchairTransitStatus,
      //   updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      // });

      const wheelchairSnapshot = await db
        .collection("wheelchairs")
        .doc(wheelchairId)
        .get();


        for (const doc of wheelchairs.docs) {
        const wc = doc.data();

        if (
          wc.status === "In Transit" &&
          !wc.activeRequestId &&
          !wc.assignedPatient
        ) {
          await doc.ref.update({
            status: "Available",
          });
        }
      }

      if (
        wheelchairSnapshot.exists &&
        wheelchairSnapshot.data()?.activeRequestId !==
          requestRef?.id
      ) {
        return false;
      }

      const nextLocation = interpolateLocation(
        startCoords,
        destinationCoords,
        step / steps
      );

      await db.collection("wheelchairs").doc(wheelchairId).update({
        location: nextLocation,
        status: wheelchairTransitStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      if (step < steps) {
        await sleep(interval);
      }
    }
  }

  if (requestRef) {
    const activeRequest = await requestRef.get();
    if (!activeRequest.exists || activeRequest.data()?.status === "cancelled") {
        await db.collection("wheelchairs").doc(wheelchairId).update({
          status: "Available",
          assignedPatient: null,
          activeRequestId: null,
          isOpen: false,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
            
      return false;
    }
  }

  const arrivalBatch = db.batch();
  arrivalBatch.update(db.collection("wheelchairs").doc(wheelchairId), {
    location: destinationCoords,
    status: wheelchairArrivalStatus,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  if (requestRef && requestArrivalStatus) {
    arrivalBatch.update(requestRef, {
      status: requestArrivalStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  await arrivalBatch.commit();
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
  if (!targetCoords) {
    throw new Error("Pickup location coordinates are unavailable.");
  }

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
      updatedAt: now,
    });
  }

  await batch.commit();

  if (availableWheelchair && targetCoords) {
    void moveWheelchairToLocation(availableWheelchair.id, targetCoords, {
      requestTransitStatus: "pickup_in_transit",
      requestArrivalStatus: "pickup_arrived",
      wheelchairArrivalStatus: "At Pickup",
    });
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
  if (!targetCoords) {
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
    status: "In Transit",
    assignedPatient: oldestPendingRequest.patientId,
    activeRequestId: oldestPendingRequest.id,
    updatedAt: now,
  });

  await batch.commit();

  const targetLocation = targetCoords || oldestPendingRequest.location;
  void moveWheelchairToLocation(wheelchair.id, targetLocation, {
    requestTransitStatus: "pickup_in_transit",
    requestArrivalStatus: "pickup_arrived",
    wheelchairArrivalStatus: "At Pickup",
  });

  return oldestPendingRequest.id;
}

export async function moveAssignedWheelchairToDestination(requestId, destination) {
  const db = firebase.firestore();
  const requestDoc = await db.collection("requests").doc(requestId).get();

  if (!requestDoc.exists) {
    throw new Error("Request not found.");
  }

  const request = requestDoc.data();
  if (!request.wheelchairId) {
    throw new Error("No wheelchair is assigned to this request.");
  }
  if (request.status !== "pickup_arrived") {
    throw new Error("The wheelchair must arrive at the pickup location first.");
  }

  const destinationCoords = await getLocationCoordsAsync(destination);
  if (!destinationCoords) {
    throw new Error("Destination coordinates are unavailable.");
  }

  return moveWheelchairToLocation(request.wheelchairId, destinationCoords, {
    requestTransitStatus: "destination_in_transit",
    requestArrivalStatus: "destination_arrived",
    wheelchairArrivalStatus: "At Destination",
  });
}

export async function completeRequestAndReleaseWheelchair(requestId) {
  const db = firebase.firestore();
  const requestRef = db.collection("requests").doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new Error("Request not found.");
  }

  const request = requestDoc.data();
  if (request.status !== "destination_arrived") {
    throw new Error("The wheelchair has not reached the destination yet.");
  }

  const wheelchairId = request.wheelchairId;
  const wheelchairRef = wheelchairId
    ? db.collection("wheelchairs").doc(wheelchairId)
    : null;
  const wheelchairDoc = wheelchairRef ? await wheelchairRef.get() : null;
  const wheelchair = wheelchairDoc?.exists ? wheelchairDoc.data() : null;
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.update(requestRef, {
    status: "completed",
    queueStatus: "completed",
    completedAt: now,
    updatedAt: now,
  });

  if (wheelchairRef && wheelchair) {
    batch.update(wheelchairRef, {
      status: "Returning",
      assignedPatient: null,
      activeRequestId: null,
      isOpen: false,
      updatedAt: now,
    });
  }

  await batch.commit();

  if (!wheelchairRef || !wheelchair) {
    return true;
  }

  const dockingPosition = getLocationCoords(wheelchair.dockingPosition);
  if (dockingPosition) {
    const returnedToDock = await moveWheelchairToLocation(wheelchairId, dockingPosition, {
      wheelchairTransitStatus: "Returning",
      wheelchairArrivalStatus: "Available",
    });

    if (!returnedToDock) {
      await wheelchairRef.update({
        status: "Available",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  } else {
    await wheelchairRef.update({
      status: "Available",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  await assignOldestPendingRequestToWheelchair(wheelchairId);
  return true;
}

export async function cancelRequestAndReleaseWheelchair(requestId) {
  const db = firebase.firestore();
  const requestRef = db.collection("requests").doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new Error("Request not found.");
  }

  const request = requestDoc.data();
  const wheelchairId = request.wheelchairId;
  const wheelchairRef = wheelchairId
    ? db.collection("wheelchairs").doc(wheelchairId)
    : null;
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.update(requestRef, {
    status: "cancelled",
    queueStatus: "cancelled",
    updatedAt: now,
  });

  if (wheelchairRef) {
    batch.update(wheelchairRef, {
      status: "Available",
      assignedPatient: null,
      activeRequestId: null,
      isOpen: false,
      updatedAt: now,
    });
  }

  await batch.commit();

  if (wheelchairId) {
    await assignOldestPendingRequestToWheelchair(wheelchairId);
  }

  return true;
}
