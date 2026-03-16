/**
 * Normalizes model messages for providers with limited content support (e.g. Groq).
 * Groq's Chat Completions API rejects:
 * - Content as array of parts (reasoning, file, tool-call, etc.)
 * - messages[].name
 * - providerOptions/providerMetadata
 *
 * This converts all content to plain strings and strips unsupported fields.
 */

type MessageRole = "system" | "user" | "assistant" | "tool" | "data";

interface NormalizedMessage {
  role: MessageRole;
  content: string;
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part !== "object" || part === null) return "";
      const p = part as Record<string, unknown>;
      // TextPart: { type: 'text', text: string }
      if (p.type === "text" && typeof p.text === "string") return p.text;
      // ReasoningPart: { type: 'reasoning', text: string } - include as text for context
      if (p.type === "reasoning" && typeof p.text === "string") return p.text;
      // FilePart, ImagePart, ToolCallPart, etc. - skip or add placeholder
      if (p.type === "file" || p.type === "image")
        return "[Unsupported: file/image content omitted for this provider]";
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Normalizes model messages to plain string content for providers like Groq
 * that don't support array content, reasoning blocks, or provider metadata.
 */
export function normalizeMessagesForStrictProviders(
  messages: Array<{ role: string; content: unknown; [key: string]: unknown }>
): NormalizedMessage[] {
  const result: NormalizedMessage[] = [];

  for (const msg of messages) {
    const role = msg.role as MessageRole;

    // Skip tool messages - Groq may not support them in chat completions
    if (role === "tool") continue;

    const content = extractTextFromContent(msg.content);
    // Skip empty messages
    if (!content.trim()) continue;

    result.push({
      role: role as "system" | "user" | "assistant",
      content,
    });
  }

  return result;
}
