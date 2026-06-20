const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.firestoreToRTDB = onDocumentUpdated(
  "wheelchairs/{chairId}",
  async (event) => {

    const after = event.data.after.data();

    if (!after) return;

    const currentRTDB = (
      await admin.database()
        .ref("/wheelchair/isOpen")
        .get()
    ).val();

    if (currentRTDB !== after.isOpen) {

      await admin.database()
        .ref("/wheelchair/isOpen")
        .set(after.isOpen);

      console.log(
        "Synced Firestore -> RTDB:",
        after.isOpen
      );
    }
  }
);


const { onValueWritten } = require("firebase-functions/v2/database");


exports.rtdbToFirestore = onValueWritten(
  {
    ref: "/wheelchair/isOpen",
    region: "asia-southeast1"
  },
  async (event) => {

    const isOpen = event.data.after.val();

    const snapshot = await admin.firestore()
      .collection("wheelchairs")
      .where("chairId", "==", "wheelchair_1")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("No wheelchair document found");
      return;
    }

    const doc = snapshot.docs[0];

    if (doc.data().isOpen !== isOpen) {cd

      await doc.ref.update({
        isOpen: isOpen
      });

      console.log(
        "Synced RTDB -> Firestore:",
        isOpen
      );
    }
  }
);