import { db } from "./init";
import admin from "firebase-admin";
import { ChatRole } from "./type";

export async function createChatSession(
  sessionId: string,
  data?: {
    productSKU?: string;
    productName?: string;
    locationName?: string;
  }
) {
  const ref = db.collection("ProductAIChat").doc(sessionId);

// console.log("Project ID:", admin.app().options.projectId);


  await ref.set(
    {
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...data,
    },
    { merge: true }
  );
}

export async function saveChatMessage(
  sessionId: string,
  role: ChatRole,
  content: string
) {
  const messagesRef = db
    .collection("ProductAIChat")
    .doc(sessionId)
    .collection("messages");

  await messagesRef.add({
    role,
    content,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update session timestamp
  await db.collection("ProductAIChat").doc(sessionId).update({
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}