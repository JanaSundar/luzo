import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const ANALYZER_PROMPT = `You are an expert API response analyzer. Analyze the following API response and provide:
1. A brief summary of what the response contains
2. Any potential issues (missing fields, unexpected values, performance concerns)
3. Suggestions for improvement if applicable

HTTP Status: {status} {statusText}
Response Time: {responseTime}ms
Response Size: {responseSize} bytes

Response Headers:
{headers}

Response Body:
{body}

{schema}

Provide a clear, concise analysis.`;

export function createResponseAnalyzerChain(model: BaseChatModel) {
  const prompt = ChatPromptTemplate.fromTemplate(ANALYZER_PROMPT);
  const parser = new StringOutputParser();

  return RunnableSequence.from([prompt, model, parser]);
}
