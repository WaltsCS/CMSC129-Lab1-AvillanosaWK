//backend/firebase.js
const admin = require("firebase-admin");
const path = require("path");

function initFirebase() {
  if (admin.apps.length) return admin;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_PATH in backend/.env (absolute path to service account JSON)."
    );
  }

  //Require the JSON safely via absolute path
  //On Windows, require() accepts absolute paths.
  const serviceAccount = require(path.resolve(serviceAccountPath));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
}

const adminInstance = initFirebase();
const db = adminInstance.firestore();

module.exports = { admin: adminInstance, db };