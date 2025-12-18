export type ChatRole = "system" | "user" | "assistant" | "function";

export interface ChatMessage {
  role: ChatRole;
  name?: string;
  content: string;
  createdAt?: number;
}