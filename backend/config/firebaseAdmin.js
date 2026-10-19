const {initializeApp,cert,getApps,} = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./serviceAccountKey.json");

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const firebaseAuth = getAuth();

module.exports = { firebaseAuth };