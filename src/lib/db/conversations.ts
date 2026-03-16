import { prisma } from "./index";

export async function createConversation(userId: string, title?: string) {
  return prisma.conversation.create({
    data: { userId, title },
    include: { messages: true },
  });
}

export async function getConversation(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 500,
      },
    },
  });
}

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateConversationTitle(id: string, title: string) {
  return prisma.conversation.update({
    where: { id },
    data: { title },
  });
}

export async function deleteConversation(id: string) {
  return prisma.conversation.delete({ where: { id } });
}
