import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { executeApiRequest, explainResponse, parseOpenApiSpec } from "../tools/index";

export function createApiAssistant(model: BaseChatModel) {
  return createReactAgent({
    llm: model,
    tools: [executeApiRequest, parseOpenApiSpec, explainResponse],
    messageModifier: `You are a specialized API testing assistant. Your role is to:
1. Help users construct and execute API requests
2. Analyze API responses and identify issues  
3. Generate test cases and edge case scenarios
4. Explain OpenAPI specifications
Always be precise, technical, and helpful.`,
  });
}
