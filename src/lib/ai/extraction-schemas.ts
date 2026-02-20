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
    availability_windows: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day_of_week: {
            type: SchemaType.NUMBER,
            description: "Day of week: 0=Monday, 1=Tuesday, ..., 6=Sunday",
          },
          start_minutes: {
            type: SchemaType.NUMBER,
            description:
              "Start time in minutes from midnight (0-1439). E.g., 540 = 9:00 AM",
          },
          end_minutes: {
            type: SchemaType.NUMBER,
            description:
              "End time in minutes from midnight (1-1440). E.g., 1020 = 5:00 PM",
          },
        },
        required: ["day_of_week", "start_minutes", "end_minutes"],
      },
      description:
        "Weekly recurring UNAVAILABILITY windows — times the person is NOT available. Extract from text like 'busy weekday evenings' or 'not free Saturday 2-4pm'. If the text says they ARE available at certain times, invert: extract the complement as blocked windows.",
    },
    timezone: {
      type: SchemaType.STRING,
      description:
        "IANA timezone if mentioned (e.g., 'America/New_York', 'Europe/Berlin')",
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
    availability_mode: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["flexible", "recurring", "specific_dates"],
      description:
        "Schedule type: 'flexible' if no specific schedule mentioned (default), 'recurring' if weekly times specified, 'specific_dates' if exact dates given",
    },
    availability_windows: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day_of_week: {
            type: SchemaType.NUMBER,
            description: "Day of week: 0=Monday, 1=Tuesday, ..., 6=Sunday",
          },
          start_minutes: {
            type: SchemaType.NUMBER,
            description:
              "Start time in minutes from midnight (0-1439). E.g., 540 = 9:00 AM",
          },
          end_minutes: {
            type: SchemaType.NUMBER,
            description:
              "End time in minutes from midnight (1-1440). E.g., 1020 = 5:00 PM",
          },
        },
        required: ["day_of_week", "start_minutes", "end_minutes"],
      },
      description:
        "Weekly recurring availability windows. Only populate when availability_mode is 'recurring'",
    },
    timezone: {
      type: SchemaType.STRING,
      description:
        "IANA timezone if mentioned (e.g., 'America/New_York', 'Europe/Berlin')",
    },
  };

  const required =
    mode === "update"
      ? ["updated_text", "skills"]
      : ["title", "description", "skills"];

  return { type: SchemaType.OBJECT, properties, required };
}
