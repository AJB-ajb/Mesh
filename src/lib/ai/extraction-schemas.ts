/**
 * Centralized Gemini extraction schemas for profiles and postings.
 *
 * Factory functions return `Schema` objects for structured output.
 * The `mode` parameter controls whether the schema includes the
 * `updated_text` field (needed for update operations).
 */

import { SchemaType, type ObjectSchema } from "@google/generative-ai";

type ExtractionMode = "extract" | "update";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function profileExtractionSchema(mode: ExtractionMode): ObjectSchema {
  const properties: ObjectSchema["properties"] = {
    ...(mode === "update" && {
      updated_text: {
        type: SchemaType.STRING,
        description:
          "The full updated source text with the update instruction applied. Preserve all original information unless explicitly contradicted.",
      },
    }),
    full_name: {
      type: SchemaType.STRING,
      description: "The person's full name",
    },
    headline: {
      type: SchemaType.STRING,
      description:
        "A short professional headline (e.g., 'Full-stack Developer')",
    },
    bio: {
      type: SchemaType.STRING,
      description: "A brief bio or summary about the person",
    },
    location: {
      type: SchemaType.STRING,
      description: "Location or timezone if mentioned",
    },
    skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "List of technical skills, programming languages, frameworks, and tools",
    },
    interests: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Areas of interest (e.g., AI, fintech, gaming)",
    },
    languages: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Spoken languages as ISO codes (e.g., en, de, es)",
    },
    portfolio_url: {
      type: SchemaType.STRING,
      description: "Portfolio website URL if mentioned",
    },
    github_url: {
      type: SchemaType.STRING,
      description: "GitHub profile URL if mentioned",
    },
    skill_levels: {
      type: SchemaType.STRING,
      description:
        'JSON-encoded map of domain to skill level (0-10). Example: {"programming": 7, "design": 4}',
    },
    location_preference: {
      type: SchemaType.NUMBER,
      description:
        "Location preference: 0.0 = in-person only, 0.5 = either, 1.0 = remote only",
    },
  };

  const required = mode === "update" ? ["updated_text", "skills"] : ["skills"];

  return { type: SchemaType.OBJECT, properties, required };
}

// ---------------------------------------------------------------------------
// Posting
// ---------------------------------------------------------------------------

export function postingExtractionSchema(mode: ExtractionMode): ObjectSchema {
  const properties: ObjectSchema["properties"] = {
    ...(mode === "update" && {
      updated_text: {
        type: SchemaType.STRING,
        description:
          "The full updated source text with the update instruction applied. Preserve all original information unless explicitly contradicted.",
      },
    }),
    title: {
      type: SchemaType.STRING,
      description: "A concise posting title (max 100 characters)",
    },
    description: {
      type: SchemaType.STRING,
      description:
        "A clear description explaining what the posting is about and what's being built",
    },
    skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "List of required technical skills, programming languages, frameworks, and tools needed",
    },
    category: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["study", "hackathon", "personal", "professional", "social"],
      description: "Category of the posting",
    },
    estimated_time: {
      type: SchemaType.STRING,
      description:
        "Estimated time to complete (e.g., '2 weeks', '3 months', 'ongoing')",
    },
    team_size_min: {
      type: SchemaType.NUMBER,
      description: "Minimum number of people needed for the team",
    },
    team_size_max: {
      type: SchemaType.NUMBER,
      description: "Maximum number of people needed for the team",
    },
    tags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "Tags or keywords describing the posting (e.g., 'hackathon', 'open-source', 'MVP')",
    },
    context_identifier: {
      type: SchemaType.STRING,
      description:
        "Course code, hackathon name, or group identifier if mentioned (e.g., 'CS101', 'HackMIT 2026')",
    },
    mode: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["open", "friend_ask"],
      description:
        "Posting mode: 'open' for public discovery (default), 'friend_ask' for sequential connection-by-connection invites",
    },
  };

  const required =
    mode === "update"
      ? ["updated_text", "skills"]
      : ["title", "description", "skills"];

  return { type: SchemaType.OBJECT, properties, required };
}
