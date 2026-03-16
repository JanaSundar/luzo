import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNewConversation,
  fetchConversations,
  removeConversation,
  renameConversation,
} from "@/app/actions/conversations";

const CONVERSATIONS_KEY = ["conversations"];

export function useConversations(userId: string) {
  return useQuery({
    queryKey: [...CONVERSATIONS_KEY, userId],
    queryFn: () => fetchConversations(userId),
    enabled: Boolean(userId),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, title }: { userId: string; title?: string }) =>
      createNewConversation(userId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeConversation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameConversation(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}
