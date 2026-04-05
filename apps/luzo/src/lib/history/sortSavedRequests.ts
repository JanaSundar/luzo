import type { SavedRequest } from "@/types";

function recencyTime(r: SavedRequest): number {
  return new Date(r.updatedAt || r.createdAt).getTime();
}

/** Newest activity first (by updatedAt, then createdAt). */
export function sortSavedRequestsByRecencyDesc(items: SavedRequest[]): SavedRequest[] {
  return [...items].sort((a, b) => recencyTime(b) - recencyTime(a));
}
