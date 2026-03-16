import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import type { ApiRequest } from "@/types";

const INTERPRETER_PROMPT = `You are an API request parser. Convert the user's natural language description into a structured API request.

Return a JSON object with this exact structure:
{{
  "method": "GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS",
  "url": "the full URL",
  "headers": [{{ "key": "...", "value": "...", "enabled": true }}],
  "params": [{{ "key": "...", "value": "...", "enabled": true }}],
  "body": "JSON string or null",
  "bodyType": "none|json|form-data|x-www-form-urlencoded|raw",
  "auth": {{ "type": "none" }}
}}

User request: {input}

Return ONLY valid JSON, no markdown, no explanation.`;

export function createApiInterpreterChain(model: BaseChatModel) {
  const prompt = ChatPromptTemplate.fromTemplate(INTERPRETER_PROMPT);
  const parser = new JsonOutputParser<Partial<ApiRequest>>();

  return RunnableSequence.from([prompt, model, parser]);
}
