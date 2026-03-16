"use server";

import { generateText } from "ai";
import { getAiSdkModel } from "@/lib/ai/provider-api";
import type { AiModelConfig, AutomationStep } from "@/types";

export interface TestPlanStep {
  stepId: string;
  testScript: string;
  explanation: string;
}

export async function generateAiTestPlan(
  sequence: AutomationStep[],
  config: AiModelConfig
): Promise<TestPlanStep[]> {
  const model = getAiSdkModel(config);

  const prompt = `
    You are an expert QA Engineer. Analyze the following sequence of API requests and responses.
    Generate a concise JavaScript test script (Postman/Luzo style) for EACH step to verify the response.
    
    The scripts should use:
    - pm.test("name", function() { ... })
    - pm.expect(pm.response.json()).to.have.property(...)
    - pm.expect(pm.response.status).to.equal(200)
    
    Sequence of Steps:
    ${sequence
      .map(
        (step, i) => `
    Step ${i + 1} (id: "${step.id}"): ${step.method} ${step.url}
    Request Body: ${step.body ?? "None"}
    Response Status: ${step.response?.status ?? "Unknown"}
    Response Body: ${step.response?.body ? JSON.stringify(step.response.body).slice(0, 800) : "None"}
    `
      )
      .join("\n")}

    Return ONLY a valid JSON array. Each element MUST use the exact step id provided above.
    Required format: [{ "stepId": "<exact id from above>", "testScript": "...", "explanation": "..." }]
    
    DO NOT include markdown formatting, code fences, or backticks. Return ONLY the raw JSON array.
  `;

  try {
    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.1,
    });

    // Robustly extract JSON - strip markdown fences and find first [...] block
    const cleanedText = text.trim();

    // Attempt to find a JSON array block
    const arrayMatch = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const jsonString = arrayMatch
      ? arrayMatch[0]
      : cleanedText
          .replace(/```(json)?/g, "")
          .replace(/```/g, "")
          .trim();

    try {
      return JSON.parse(jsonString) as TestPlanStep[];
    } catch (parseError) {
      console.error("AI returned invalid JSON:", text);
      const message = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Failed to parse AI response: ${message}`);
    }
  } catch (error) {
    console.error("AI QA Generation failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message || "Failed to generate AI tests");
  }
}
