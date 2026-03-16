"use server";

import { isDatabaseConfigured } from "@/lib/db/index";
import { addMessage, getMessages } from "@/lib/db/messages";
import type { ConversationMessage } from "@/types";

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<ConversationMessage> {
  const message = {
    id: crypto.randomUUID(),
    role: "user" as const,
    content,
    createdAt: new Date().toISOString(),
  };

  if (isDatabaseConfigured()) {
    await addMessage(conversationId, "user", content);
  }

  return message;
}

export async function saveAssistantMessage(
  conversationId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<ConversationMessage> {
  const message = {
    id: crypto.randomUUID(),
    role: "assistant" as const,
    content,
    createdAt: new Date().toISOString(),
    metadata,
  };

  if (isDatabaseConfigured()) {
    await addMessage(conversationId, "assistant", content, metadata);
  }

  return message;
}

export async function loadConversationMessages(
  conversationId: string
): Promise<ConversationMessage[]> {
  if (!isDatabaseConfigured()) return [];

  const messages = await getMessages(conversationId);
  return messages.map(
    (m: { id: string; role: string; content: string; createdAt: Date; metadata: unknown }) => ({
      id: m.id,
      role: m.role as ConversationMessage["role"],
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      metadata: m.metadata as ConversationMessage["metadata"],
    })
  );
}
