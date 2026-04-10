import type { ApiRequest, KeyValuePair } from "@/types";

function normalizePairs(pairs: KeyValuePair[]): { key: string; value: string }[] {
  return pairs
    .filter((p) => p.enabled !== false && p.key.trim() !== "")
    .map((p) => ({ key: p.key.trim(), value: p.value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Compare requests for history dedup: same URL, method, headers, params, body, body type, form data, auth, scripts. */
export function areRequestsHistoryEquivalent(a: ApiRequest, b: ApiRequest): boolean {
  if (a.method !== b.method) return false;
  if (a.url.trim() !== b.url.trim()) return false;
  if (a.bodyType !== b.bodyType) return false;
  if ((a.body ?? "") !== (b.body ?? "")) return false;

  if (JSON.stringify(normalizePairs(a.headers)) !== JSON.stringify(normalizePairs(b.headers))) {
    return false;
  }
  if (JSON.stringify(normalizePairs(a.params)) !== JSON.stringify(normalizePairs(b.params))) {
    return false;
  }

  const fa = a.formDataFields ?? [];
  const fb = b.formDataFields ?? [];
  const normForm = (fields: typeof fa) =>
    fields
      .filter((f) => f.enabled !== false && f.key.trim() !== "")
      .map((f) => ({
        key: f.key.trim(),
        type: f.type,
        value: f.value,
        fileName: f.fileName ?? "",
      }))
      .sort((x, y) => x.key.localeCompare(y.key));

  if (JSON.stringify(normForm(fa)) !== JSON.stringify(normForm(fb))) return false;

  if (JSON.stringify(a.auth) !== JSON.stringify(b.auth)) return false;

  if ((a.preRequestScript ?? "") !== (b.preRequestScript ?? "")) return false;
  if ((a.postRequestScript ?? "") !== (b.postRequestScript ?? "")) return false;
  if ((a.testScript ?? "") !== (b.testScript ?? "")) return false;

  return true;
}
