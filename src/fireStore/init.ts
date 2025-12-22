import admin from "firebase-admin";

import fs from "fs";
import path from "path";

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialsPath) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set");
}

const resolvedPath = path.resolve(credentialsPath);

if (!fs.existsSync(resolvedPath)) {
  throw new Error(`Service account file not found at ${resolvedPath}`);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(resolvedPath, "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

// console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
// console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
// console.log("Project ID:", admin.app().options.projectId);
// console.log(
//   "Service account:",
//   (admin.app().options.credential as any)?.clientEmail
// );

export const db = admin.firestore();
db.settings({ databaseId: "kioskaichat" });
