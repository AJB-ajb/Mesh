/**
 * Prompt and schema for LLM deep matching via Gemini.
 * Evaluates candidate fit against a posting with nuanced analysis.
 */

import { SchemaType, type ObjectSchema } from "@google/generative-ai";

export const DEEP_MATCH_SYSTEM_PROMPT = `You are an expert talent matcher for a collaboration platform. Your job is to evaluate how well a candidate's profile matches a posting/project.

Given a posting and a candidate profile, you must:
1. Identify distinct roles the posting needs (if multiple)
2. Evaluate the candidate's fit for the best-matching role
3. Score the match from 0 to 1 (0 = no fit, 1 = perfect fit)
4. Explain your reasoning in 2-3 concise sentences
5. Note any concerns or gaps

Consider:
- Skill alignment (both explicit and transferable skills)
- Experience level appropriateness
- Availability and location compatibility
- Communication style and collaboration preferences
- Domain knowledge and relevant background

Be honest but fair. A 0.7+ score means strong fit. Below 0.3 means poor fit.`;

export function deepMatchResponseSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      identified_roles: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description:
          "Distinct roles identified in the posting (e.g., 'Frontend Developer', 'Designer')",
      },
      matched_role: {
        type: SchemaType.STRING,
        description: "The role the candidate best fits",
      },
      score: {
        type: SchemaType.NUMBER,
        description: "Match score from 0.0 to 1.0",
      },
      explanation: {
        type: SchemaType.STRING,
        description:
          "2-3 sentence explanation of why this is a good or poor match",
      },
      concerns: {
        type: SchemaType.STRING,
        description:
          "Brief note on any gaps or concerns. Empty string if none.",
      },
    },
    required: [
      "identified_roles",
      "matched_role",
      "score",
      "explanation",
      "concerns",
    ],
  };
}

export function buildDeepMatchUserPrompt(input: {
  postingTitle: string;
  postingText: string;
  profileText: string;
  fastFilterSummary: string;
}): string {
  return `## Posting
**Title:** ${input.postingTitle}
**Description:**
${input.postingText}

## Candidate Profile
${input.profileText}

## Fast Filter Summary
${input.fastFilterSummary}

Evaluate this candidate's fit for the posting.`;
}
