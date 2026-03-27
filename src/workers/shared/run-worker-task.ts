import type { Result } from "@/types";

export async function runWorkerTask<T>(task: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "invalid_node",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
