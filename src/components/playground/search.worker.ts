import * as Comlink from "comlink";

export interface SearchResult {
  matchingLineIndexes: number[];
  matchCount: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchLines(lines: string[], query: string): SearchResult {
  if (!query.trim()) {
    return { matchingLineIndexes: [], matchCount: 0 };
  }

  const regex = new RegExp(escapeRegex(query), "gi");
  const matchingLineIndexes: number[] = [];
  let matchCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(regex);
    if (matches) {
      matchingLineIndexes.push(i);
      matchCount += matches.length;
    }
  }

  return { matchingLineIndexes, matchCount };
}

const api = {
  searchLines,
};

export type SearchWorkerApi = typeof api;

Comlink.expose(api);
