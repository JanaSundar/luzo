"use server";

import { generateCode } from "@/lib/utils/code-generator";
import type { ApiRequest, CodeGenerationOptions } from "@/types";

export async function generateCodeAction(
  request: ApiRequest,
  options: CodeGenerationOptions,
): Promise<string> {
  try {
    return generateCode(request, options);
  } catch (error: unknown) {
    console.error("Code generation action error:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || "Failed to generate code");
  }
}
