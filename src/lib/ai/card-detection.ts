/**
 * LLM-based coordination intent detection.
 *
 * Analyzes recent messages to detect if a card would help coordinate.
 * Uses the fast (flash-lite) model since it runs frequently.
 */

import { SchemaType, type ObjectSchema } from "@google/generative-ai";
import { generateStructuredJSON } from "./gemini";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DetectedCardType =
  | "poll"
  | "time_proposal"
  | "rsvp"
  | "task_claim"
  | null;

export interface CardDetectionResult {
  suggested_type: DetectedCardType;
  confidence: number; // 0-1
  reason: string;
  prefilled_data: {
    question?: string;
    title?: string;
    options?: string[];
    description?: string;
  };
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export function cardDetectionSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      suggested_type: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["poll", "time_proposal", "rsvp", "task_claim", "none"],
        description:
          "The card type to suggest. 'none' if no coordination card would help.",
      },
      confidence: {
        type: SchemaType.NUMBER,
        description: "0-1 confidence that a card would actually help here",
      },
      reason: {
        type: SchemaType.STRING,
        description: "Brief explanation of why this card type was chosen",
      },
      prefilled_question: {
        type: SchemaType.STRING,
        description:
          "For poll: the question. For time_proposal/rsvp: the title.",
      },
      prefilled_options: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description:
          "Pre-filled option labels (poll options, time slots, etc.)",
      },
      prefilled_description: {
        type: SchemaType.STRING,
        description: "For task_claim: the task description",
      },
    },
    required: ["suggested_type", "confidence", "reason"],
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You detect coordination intent in group chat messages.

Given recent messages from a group conversation, determine if a structured card would help the group coordinate. Card types:

1. **poll** — Someone is asking for opinions or trying to decide between options
   Examples: "What should we work on?", "Pizza or sushi?", "Which day works?"
2. **time_proposal** — Someone is trying to schedule a meeting or activity
   Examples: "When should we meet?", "Let's find a time", "Are you free this week?"
3. **rsvp** — Someone is confirming attendance for a known event
   Examples: "Who's coming to the hackathon?", "Can everyone make it Saturday?"
4. **task_claim** — Someone needs a volunteer for a specific task
   Examples: "Someone needs to book the room", "Who can bring the projector?"

Rules:
- Only suggest a card if the intent is CLEAR (confidence > 0.6)
- If messages are just casual chat, return type "none"
- Pre-fill options when they're mentioned in the messages
- For time_proposal, extract any mentioned times as options
- For poll, extract the question and any mentioned choices
- Don't suggest cards for messages that are just questions without coordination need
- Be conservative — false negatives are better than false positives`;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export async function detectCardIntent(
  messages: { sender_name: string; content: string }[],
): Promise<CardDetectionResult> {
  const userPrompt = messages
    .map((m) => `${m.sender_name}: ${m.content}`)
    .join("\n");

  const raw = await generateStructuredJSON<{
    suggested_type: string;
    confidence: number;
    reason: string;
    prefilled_question?: string;
    prefilled_options?: string[];
    prefilled_description?: string;
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: cardDetectionSchema(),
    tier: "fast",
  });

  const suggestedType =
    raw.suggested_type === "none"
      ? null
      : (raw.suggested_type as DetectedCardType);

  return {
    suggested_type: suggestedType,
    confidence: raw.confidence,
    reason: raw.reason,
    prefilled_data: {
      question: raw.prefilled_question,
      title: raw.prefilled_question,
      options: raw.prefilled_options,
      description: raw.prefilled_description,
    },
  };
}
