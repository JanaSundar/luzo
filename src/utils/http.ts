import type { HttpMethod } from "@/types";

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
];

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  DELETE: "text-red-500",
  PATCH: "text-purple-500",
  HEAD: "text-cyan-500",
  OPTIONS: "text-gray-500",
};

export const METHOD_BG_COLORS: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-600",
  POST: "bg-blue-500/15 text-blue-600",
  PUT: "bg-amber-500/15 text-amber-600",
  DELETE: "bg-red-500/15 text-red-600",
  PATCH: "bg-purple-500/15 text-purple-600",
  HEAD: "bg-cyan-500/15 text-cyan-600",
  OPTIONS: "bg-gray-500/15 text-gray-600",
};
