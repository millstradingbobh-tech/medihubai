import { db } from "./init";
import { ChatMessage } from "./type";

export async function getChatHistory(
  sessionId: string,
  limit = 50
): Promise<ChatMessage[]> {

  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  const sessionRef = db.collection("ProductAIChat").doc(sessionId);

  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    console.warn("Chat session not found:", sessionId);
    return [];
  }
  const snapshot = await sessionRef
    .collection("messages")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as ChatMessage),
  }));
}