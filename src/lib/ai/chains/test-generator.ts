import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const GENERATOR_PROMPT = `You are a test data generator. Generate realistic mock data that matches the provided JSON schema.

Schema:
{schema}

Generate {count} items of test data. Include edge cases like nulls, empty strings, and boundary values.
Return a JSON array of objects matching the schema. Return ONLY valid JSON, no explanation.`;

export function createTestGeneratorChain(model: BaseChatModel) {
  const prompt = ChatPromptTemplate.fromTemplate(GENERATOR_PROMPT);
  const parser = new JsonOutputParser<unknown[]>();

  return RunnableSequence.from([prompt, model, parser]);
}
