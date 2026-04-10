import type { TemplateDefinition } from "@/types";

export async function fetchTemplates(dbUrl: string): Promise<TemplateDefinition[]> {
  const response = await fetch("/api/db/templates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dbUrl }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to load templates");
  }
  return data.templates as TemplateDefinition[];
}

export async function saveTemplate(dbUrl: string, template: TemplateDefinition) {
  const response = await fetch("/api/db/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dbUrl, data: template }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to save template");
  }
  return data as { ok: boolean };
}

export async function removeTemplate(dbUrl: string, id: string) {
  const response = await fetch("/api/db/templates", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dbUrl, id }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to delete template");
  }
  return data as { ok: boolean };
}
