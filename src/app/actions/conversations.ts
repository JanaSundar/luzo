"use server";

import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  updateConversationTitle,
} from "@/lib/db/conversations";
import { isDatabaseConfigured } from "@/lib/db/index";
import type { Conversation, ConversationMessage } from "@/types";

export async function createNewConversation(
  userId: string,
  title?: string
): Promise<Conversation | null> {
  if (!isDatabaseConfigured()) return null;

  const conv = await createConversation(userId, title);
  return {
    id: conv.id,
    title: conv.title ?? undefined,
    messages: [],
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  };
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  if (!isDatabaseConfigured()) return [];

  const conversations = await listConversations(userId);
  return conversations.map((conv) => ({
    id: conv.id,
    title: conv.title ?? undefined,
    messages: [],
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  }));
}

export async function fetchConversation(id: string): Promise<Conversation | null> {
  if (!isDatabaseConfigured()) return null;

  const conv = await getConversation(id);
  if (!conv) return null;

  return {
    id: conv.id,
    title: conv.title ?? undefined,
    messages: conv.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      metadata: m.metadata as ConversationMessage["metadata"],
    })),
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  };
}

export async function renameConversation(id: string, title: string) {
  if (!isDatabaseConfigured()) return;
  await updateConversationTitle(id, title);
}

export async function removeConversation(id: string) {
  if (!isDatabaseConfigured()) return;
  await deleteConversation(id);
}
