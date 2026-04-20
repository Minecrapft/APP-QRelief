import { supabase } from "@/lib/supabase/client";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Sends a message history to the DRRM Chat Edge Function and returns the assistant's response.
 */
export async function sendDRRMChatMessage(messages: ChatMessage[]) {
  try {
    const { data, error } = await supabase.functions.invoke("drrm-chat", {
      body: {
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      }
    });

    if (error) {
      console.warn("Failed to send DRRM chat message:", error);
      throw error;
    }

    return data.message as ChatMessage;
  } catch (error) {
    console.warn("Error communicating with DRRM Chat service:", error);
    throw error;
  }
}
