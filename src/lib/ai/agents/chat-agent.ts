import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { executeApiRequest, explainResponse, parseOpenApiSpec } from "../tools/index";

export function createChatAgent(model: BaseChatModel) {
  return createReactAgent({
    llm: model,
    tools: [executeApiRequest, explainResponse, parseOpenApiSpec],
    messageModifier:
      "You are an expert AI assistant for API development. Help developers test APIs, understand responses, and debug issues. Use the available tools when appropriate.",
  });
}
