"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTemplates, removeTemplate, saveTemplate } from "@/features/templates/api";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { TemplateDefinition } from "@/types";

const TEMPLATE_QUERY_KEY = ["templates"] as const;

export function useTemplatesQuery() {
  const dbUrl = useSettingsStore((state) => state.dbUrl);
  const dbStatus = useSettingsStore((state) => state.dbStatus);
  const dbSchemaReady = useSettingsStore((state) => state.dbSchemaReady);

  return useQuery({
    queryKey: [...TEMPLATE_QUERY_KEY, dbUrl],
    queryFn: () => fetchTemplates(dbUrl),
    enabled: dbStatus === "connected" && dbSchemaReady && Boolean(dbUrl.trim()),
  });
}

export function useTemplateMutations() {
  const dbUrl = useSettingsStore((state) => state.dbUrl);
  const queryClient = useQueryClient();

  return {
    saveTemplate: useMutation({
      mutationFn: (template: TemplateDefinition) => saveTemplate(dbUrl, template),
      onSuccess: (_result, template) => {
        queryClient.setQueriesData<TemplateDefinition[] | undefined>(
          { queryKey: TEMPLATE_QUERY_KEY },
          (existing) => {
            if (!existing) return [template];
            const withoutCurrent = existing.filter((entry) => entry.id !== template.id);
            return [template, ...withoutCurrent];
          },
        );
      },
    }),
    deleteTemplate: useMutation({
      mutationFn: (id: string) => removeTemplate(dbUrl, id),
      onSuccess: (_result, id) => {
        queryClient.setQueriesData<TemplateDefinition[] | undefined>(
          { queryKey: TEMPLATE_QUERY_KEY },
          (existing) => existing?.filter((entry) => entry.id !== id) ?? existing,
        );
      },
    }),
  };
}
