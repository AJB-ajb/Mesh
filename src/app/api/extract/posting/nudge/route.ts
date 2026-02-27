import { SchemaType } from "@google/generative-ai";
import { generateStructuredJSON } from "@/lib/ai/gemini";
import { NUDGE_SYSTEM_PROMPT } from "@/lib/ai/nudge-prompt";
import { withAiExtraction } from "@/lib/api/with-ai-extraction";
import { apiSuccess, parseBody } from "@/lib/errors";
import type { Schema } from "@google/generative-ai";

interface NudgeResult {
  dimension: string;
  suggestion: string;
}

interface NudgeResponse {
  nudges: NudgeResult[];
}

const nudgeSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    nudges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          dimension: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["time", "location", "skills", "team_size", "level"],
          },
          suggestion: { type: SchemaType.STRING },
        },
        required: ["dimension", "suggestion"],
      },
    },
  },
  required: ["nudges"],
};

/**
 * POST /api/extract/posting/nudge
 * Analyzes posting text and suggests missing dimensions.
 */
export const POST = withAiExtraction(async (req) => {
  const { text } = await parseBody<{ text?: string }>(req);

  if (!text?.trim()) {
    return apiSuccess({ nudges: [] });
  }

  const result = await generateStructuredJSON<NudgeResponse>({
    systemPrompt: NUDGE_SYSTEM_PROMPT,
    userPrompt: text,
    schema: nudgeSchema,
    temperature: 0.3,
  });

  return apiSuccess(result);
});
