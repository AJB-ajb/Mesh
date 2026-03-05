/**
 * Gemini response schema for acceptance card generation.
 */

import { SchemaType, type ObjectSchema } from "@google/generative-ai";

export function acceptanceCardResponseSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      skip_time: {
        type: SchemaType.BOOLEAN,
        description: "True if time is already fully specified",
      },
      time_slots: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            start: {
              type: SchemaType.STRING,
              description: "ISO 8601 datetime",
            },
            end: {
              type: SchemaType.STRING,
              description: "ISO 8601 datetime",
            },
            label: {
              type: SchemaType.STRING,
              description: "Human-readable, e.g. 'Tue 6pm'",
            },
            note: {
              type: SchemaType.STRING,
              description: "Brief rationale if non-obvious",
            },
          },
          required: ["start", "end", "label"],
        },
        description: "2-5 suggested time slots. Empty if skip_time=true",
      },
      inferred_duration_minutes: {
        type: SchemaType.NUMBER,
        description: "Estimated activity duration in minutes",
      },
      questions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: {
              type: SchemaType.STRING,
              description: "Deterministic ID (q_ + hash of question text)",
            },
            question: { type: SchemaType.STRING },
            type: {
              type: SchemaType.STRING,
              format: "enum",
              enum: ["text", "yes_no", "select"],
            },
            options: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "For select type only",
            },
            source: {
              type: SchemaType.STRING,
              format: "enum",
              enum: ["poster", "inferred"],
              description: "||?|| = poster, LLM-inferred = inferred",
            },
          },
          required: ["id", "question", "type", "source"],
        },
      },
      roles: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
          },
          required: ["id", "name"],
        },
        description:
          "Role options if posting describes multiple roles. Empty otherwise.",
      },
    },
    required: ["skip_time", "time_slots", "questions", "roles"],
  };
}
