import { db } from "./init";
import { ChatMessage } from "./type";

export async function getDeviceChat(
  locationName: string
): Promise<ChatMessage[]> {
console.log('locationNamelocationName', locationName);
  const snapshot = await db
    .collection("ProductAIChat")
    .where("locationName", "==", locationName)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,                 // ✅ include Firestore document ID
    ...(doc.data() as ChatMessage),
  }));
}