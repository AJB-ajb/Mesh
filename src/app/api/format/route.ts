import { SchemaType, type ObjectSchema } from "@google/generative-ai";

import { withAuth } from "@/lib/api/with-auth";
import { generateStructuredJSON } from "@/lib/ai/gemini";
import { FORMAT_SYSTEM_PROMPT } from "@/lib/ai/text-tool-prompts";
import { apiError, apiSuccess } from "@/lib/errors";

const formatSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    formatted: {
      type: SchemaType.STRING,
      description: "The formatted text with markdown",
    },
  },
  required: ["formatted"],
};

export const POST = withAuth(async (req) => {
  const { text } = await req.json();

  if (!text?.trim()) {
    return apiError("VALIDATION", "Text is required", 400);
  }

  const result = await generateStructuredJSON<{ formatted: string }>({
    systemPrompt: FORMAT_SYSTEM_PROMPT,
    userPrompt: text,
    schema: formatSchema,
    temperature: 0.3,
  });

  return apiSuccess(result);
});
