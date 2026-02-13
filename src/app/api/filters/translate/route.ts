import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";
import type { PostingFilters } from "@/lib/types/filters";

const filterSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    category: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["study", "hackathon", "personal", "professional", "social"],
      description: "Posting category",
    },
    mode: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["open", "friend_ask"],
      description: "Posting mode",
    },
    location_mode: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["remote", "in_person", "either"],
      description:
        "Location mode: remote, in_person, or either. Map 'hybrid' to 'either'.",
    },
    location_name: {
      type: SchemaType.STRING,
      description: "City or region name for location filtering",
    },
    max_distance_km: {
      type: SchemaType.NUMBER,
      description: "Maximum distance in kilometers",
    },
    skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Skills to filter by (e.g. React, Python, TypeScript)",
    },
    skill_level_min: {
      type: SchemaType.NUMBER,
      description: "Minimum skill level (0-10)",
    },
    skill_level_max: {
      type: SchemaType.NUMBER,
      description: "Maximum skill level (0-10)",
    },
    languages: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "ISO language codes (e.g. en, de, fr)",
    },
    hours_per_week_min: {
      type: SchemaType.NUMBER,
      description: "Minimum hours per week",
    },
    hours_per_week_max: {
      type: SchemaType.NUMBER,
      description: "Maximum hours per week",
    },
    team_size_min: {
      type: SchemaType.NUMBER,
      description: "Minimum team size",
    },
    team_size_max: {
      type: SchemaType.NUMBER,
      description: "Maximum team size",
    },
    tags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Tags or keywords to filter by",
    },
  },
};

/**
 * POST /api/filters/translate
 * Translates a natural language query into structured posting filters using Gemini.
 */
export async function POST(request: Request) {
  try {
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 503 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide a search query to translate into filters" },
        { status: 400 },
      );
    }

    const filters = await generateStructuredJSON<PostingFilters>({
      systemPrompt: `You are a filter parser for a project/team-finding platform. Convert natural language search queries into structured filter objects.

Rules:
- Only set fields that are explicitly or strongly implied by the query.
- For location_mode: "remote only" → "remote", "in person" → "in_person", "hybrid" or "flexible" → "either".
- For languages: use ISO 639-1 codes (e.g. "German" → "de", "English" → "en", "Spanish" → "es").
- For hours: "10+ hours/week" → hours_per_week_min: 10. "under 20 hours" → hours_per_week_max: 20.
- For skills: extract technology names, programming languages, frameworks.
- For team_size: "solo" → team_size_max: 1, "small team" → team_size_max: 4.
- Do not fabricate filters that are not implied by the query.
- Return an empty object {} if the query does not imply any structured filters.`,
      userPrompt: `Convert this search query into structured filters:\n\n"${query.trim()}"`,
      schema: filterSchema,
      temperature: 0.3,
    });

    return NextResponse.json({
      success: true,
      filters,
    });
  } catch (error) {
    console.error("Filter translation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to translate filters",
      },
      { status: 500 },
    );
  }
}
