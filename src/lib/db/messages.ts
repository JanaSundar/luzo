import { prisma } from "./index";

const MAX_MESSAGES_PER_CONVERSATION = 500;

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata?: Record<string, unknown>
) {
  const message = await prisma.message.create({
    data: {
      conversationId,
      role,
      content,
      metadata: metadata ? (metadata as object) : undefined,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  await trimMessages(conversationId);

  return message;
}

async function trimMessages(conversationId: string) {
  const count = await prisma.message.count({ where: { conversationId } });

  if (count > MAX_MESSAGES_PER_CONVERSATION) {
    const excess = count - MAX_MESSAGES_PER_CONVERSATION;
    const oldest = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: excess,
      select: { id: true },
    });

    await prisma.message.deleteMany({
      where: { id: { in: oldest.map((m) => m.id) } },
    });
  }
}

export async function getMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}
