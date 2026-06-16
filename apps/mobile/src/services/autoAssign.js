import { firebase } from "../firebase/config";
import { getRoomCoordinates } from "./roomService";
import { getMQTTInstance } from "./mqttService";
import MQTT_CONFIG from "../config/mqttConfig";

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
  const destinationCoords =
    typeof destination === "string"
      ? await getLocationCoordsAsync(destination)
      : getLocationCoords(destination);

  if (!wheelchairId || !destinationCoords) return null;

  const wheelchairDoc = await db.collection("wheelchairs").doc(wheelchairId).get();
  if (!wheelchairDoc.exists) return null;

  const wheelchair = { id: wheelchairDoc.id, ...wheelchairDoc.data() };

  // If MQTT is available, send a move command to the robot and skip local simulation
  try {
    const mqtt = getMQTTInstance();
    if (mqtt && mqtt.isConnectedToMQTT && mqtt.isConnectedToMQTT()) {
      const topic = MQTT_CONFIG.TOPICS.WHEELCHAIR_COMMAND(wheelchair.chairId || wheelchair.id || wheelchairId);
      await mqtt.publish(topic, {
        type: MQTT_CONFIG.MESSAGE_TYPES.MOVE_TO_LOCATION,
        wheelchairId: wheelchair.chairId || wheelchair.id || wheelchairId,
        location: destinationCoords,
        requestId: options.requestId || null,
      }, { qos: 1 });

      if (!options.forceLocalSim) {
        return true;
      }
    }
  } catch (err) {
    console.warn('[autoAssign] MQTT publish failed, falling back to local simulation', err);
  }

  const startCoords = getLocationCoords(wheelchair.location);
  if (!startCoords) return null;

  const requestRef = options.requestId
    ? db.collection("requests").doc(options.requestId)
    : wheelchair.activeRequestId
    ? db.collection("requests").doc(wheelchair.activeRequestId)
    : null;

  const movementStatus = options.statusOnMove || "In Transit";
  const arrivalStatus = options.arrivalStatus;
  const arrivalWheelchairStatus = options.arrivalWheelchairStatus;

  if (requestRef && options.statusOnMove) {
    await requestRef.update({
      status: options.statusOnMove,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  const finishWheelchairUpdate = async () => {
    const updateData = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (arrivalWheelchairStatus) {
      updateData.status = arrivalWheelchairStatus;
    }
    if (options.onArrivalWheelchairUpdate) {
      Object.assign(updateData, options.onArrivalWheelchairUpdate);
    }
    if (Object.keys(updateData).length > 1) {
      await db.collection("wheelchairs").doc(wheelchairId).update(updateData);
    }
  };

  if (startCoords.x === destinationCoords.x && startCoords.y === destinationCoords.y) {
    if (requestRef && arrivalStatus) {
      await requestRef.update({
        status: arrivalStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    await finishWheelchairUpdate();
    return true;
  }

  const steps = options.steps ?? 12;
  const interval = options.interval ?? 400;

  for (let step = 1; step <= steps; step += 1) {
    const nextLocation = interpolateLocation(startCoords, destinationCoords, step / steps);

    await db.collection("wheelchairs").doc(wheelchairId).update({
      location: nextLocation,
      status: movementStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    if (step < steps) {
      await sleep(interval);
    }
  }

  if (requestRef && arrivalStatus) {
    await requestRef.update({
      status: arrivalStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  await finishWheelchairUpdate();
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
    pickupLocation: location,
    destinationLocation: null,
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
      requestId: requestRef.id,
      statusOnMove: "assigned",
      arrivalStatus: "arrived_for_pickup",
      arrivalWheelchairStatus: "Waiting",
      onArrivalWheelchairUpdate: { isOpen: false },
    });
  }

  return {
    id: requestRef.id,
    assignedWheelchairId: requestData.wheelchairId,
    assignedWheelchairLabel: requestData.wheelchairLabel,
    status: requestData.status,
  };
}

export async function setRequestDestination(requestId, destination) {
  const db = firebase.firestore();
  const requestRef = db.collection("requests").doc(requestId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) return null;

  const request = { id: requestDoc.id, ...requestDoc.data() };
  if (!request.wheelchairId) return null;

  await requestRef.update({
    destinationLocation: destination,
    status: "destination_set",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  return true;
}

export async function startTripToDestination(requestId) {
  const db = firebase.firestore();
  const requestRef = db.collection("requests").doc(requestId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) return null;

  const request = { id: requestDoc.id, ...requestDoc.data() };
  if (!request.wheelchairId || !request.destinationLocation) return null;

  const targetCoords = await getLocationCoordsAsync(request.destinationLocation);
  if (!targetCoords) return null;

  await requestRef.update({
    status: "in_transit",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  await moveWheelchairToLocation(request.wheelchairId, targetCoords, {
    requestId,
    statusOnMove: "in_transit",
    arrivalStatus: "arrived_destination",
    arrivalWheelchairStatus: "Stopped",
    onArrivalWheelchairUpdate: { isOpen: false },
  });

  return true;
}

export async function returnWheelchairToDock(requestId) {
  const db = firebase.firestore();
  const requestRef = db.collection("requests").doc(requestId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) return null;

  const request = { id: requestDoc.id, ...requestDoc.data() };
  if (!request.wheelchairId) return null;

  const wheelchairDoc = await db.collection("wheelchairs").doc(request.wheelchairId).get();
  if (!wheelchairDoc.exists) return null;

  const wheelchair = { id: wheelchairDoc.id, ...wheelchairDoc.data() };
  const dockCoords = getLocationCoords(wheelchair.dockingPosition || wheelchair.location);
  if (!dockCoords) return null;

  // Publish MQTT return_to_dock command
  try {
    await publishReturnToDock(wheelchair.id, requestId);
  } catch (err) {
    console.warn('[autoAssign] Failed to publish return_to_dock', err);
  }

  await requestRef.update({
    status: "returning",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  await moveWheelchairToLocation(wheelchair.id, dockCoords, {
    requestId,
    statusOnMove: "returning",
    arrivalStatus: "completed",
    arrivalWheelchairStatus: "Available",
    onArrivalWheelchairUpdate: {
      assignedPatient: null,
      activeRequestId: null,
      isOpen: false,
      location: wheelchair.dockingPosition || wheelchair.location,
    },
  });

  return true;
}

/**
 * Send MQTT command to open wheelchair seat
 */
export async function publishOpenSeat(wheelchairId, requestId = null) {
  try {
    const mqtt = getMQTTInstance();
    if (!mqtt || !mqtt.isConnectedToMQTT || !mqtt.isConnectedToMQTT()) {
      console.warn('[autoAssign] MQTT not connected, cannot publish open_seat');
      return false;
    }

    const topic = MQTT_CONFIG.TOPICS.WHEELCHAIR_COMMAND(wheelchairId);
    await mqtt.publish(topic, {
      type: MQTT_CONFIG.MESSAGE_TYPES.OPEN_SEAT,
      wheelchairId,
      requestId: requestId || null,
    }, { qos: 1 });

    console.log('[autoAssign] published open_seat for', wheelchairId);
    return true;
  } catch (err) {
    console.error('[autoAssign] publishOpenSeat failed:', err);
    return false;
  }
}

/**
 * Send MQTT command to close wheelchair seat
 */
export async function publishCloseSeat(wheelchairId, requestId = null) {
  try {
    const mqtt = getMQTTInstance();
    if (!mqtt || !mqtt.isConnectedToMQTT || !mqtt.isConnectedToMQTT()) {
      console.warn('[autoAssign] MQTT not connected, cannot publish close_seat');
      return false;
    }

    const topic = MQTT_CONFIG.TOPICS.WHEELCHAIR_COMMAND(wheelchairId);
    await mqtt.publish(topic, {
      type: MQTT_CONFIG.MESSAGE_TYPES.CLOSE_SEAT,
      wheelchairId,
      requestId: requestId || null,
    }, { qos: 1 });

    console.log('[autoAssign] published close_seat for', wheelchairId);
    return true;
  } catch (err) {
    console.error('[autoAssign] publishCloseSeat failed:', err);
    return false;
  }
}

/**
 * Send MQTT command to return wheelchair to dock
 */
export async function publishReturnToDock(wheelchairId, requestId = null) {
  try {
    const mqtt = getMQTTInstance();
    if (!mqtt || !mqtt.isConnectedToMQTT || !mqtt.isConnectedToMQTT()) {
      console.warn('[autoAssign] MQTT not connected, cannot publish return_to_dock');
      return false;
    }

    const topic = MQTT_CONFIG.TOPICS.WHEELCHAIR_COMMAND(wheelchairId);
    await mqtt.publish(topic, {
      type: MQTT_CONFIG.MESSAGE_TYPES.RETURN_TO_DOCK,
      wheelchairId,
      requestId: requestId || null,
    }, { qos: 1 });

    console.log('[autoAssign] published return_to_dock for', wheelchairId);
    return true;
  } catch (err) {
    console.error('[autoAssign] publishReturnToDock failed:', err);
    return false;
  }
}

/**
 * Send MQTT command to stop wheelchair
 */
export async function publishStop(wheelchairId, requestId = null) {
  try {
    const mqtt = getMQTTInstance();
    if (!mqtt || !mqtt.isConnectedToMQTT || !mqtt.isConnectedToMQTT()) {
      console.warn('[autoAssign] MQTT not connected, cannot publish stop');
      return false;
    }

    const topic = MQTT_CONFIG.TOPICS.WHEELCHAIR_COMMAND(wheelchairId);
    await mqtt.publish(topic, {
      type: MQTT_CONFIG.MESSAGE_TYPES.STOP,
      wheelchairId,
      requestId: requestId || null,
    }, { qos: 1 });

    console.log('[autoAssign] published stop for', wheelchairId);
    return true;
  } catch (err) {
    console.error('[autoAssign] publishStop failed:', err);
    return false;
  }
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
