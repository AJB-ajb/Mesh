import { SchemaType, type ObjectSchema } from "@google/generative-ai";

import { withAuth } from "@/lib/api/with-auth";
import { generateStructuredJSON } from "@/lib/ai/gemini";
import { CLEAN_SYSTEM_PROMPT } from "@/lib/ai/text-tool-prompts";
import { apiError, apiSuccess } from "@/lib/errors";

const cleanSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    cleaned: {
      type: SchemaType.STRING,
      description: "The cleaned text with grammar and spelling fixes",
    },
  },
  required: ["cleaned"],
};

export const POST = withAuth(async (req) => {
  const { text } = await req.json();

  if (!text?.trim()) {
    return apiError("VALIDATION", "Text is required", 400);
  }

  const result = await generateStructuredJSON<{ cleaned: string }>({
    systemPrompt: CLEAN_SYSTEM_PROMPT,
    userPrompt: text,
    schema: cleanSchema,
    temperature: 0.3,
  });

  return apiSuccess(result);
});
