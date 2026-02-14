import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";

/**
 * Posting extraction schema for Gemini structured output
 */
const postingSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
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
    skill_level_min: {
      type: SchemaType.NUMBER,
      description:
        "Minimum skill level required (0=absolute beginner, 10=expert). Only include when explicitly stated or strongly implied.",
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
        "Posting mode: 'open' for public discovery (default), 'friend_ask' for sequential friend-by-friend requests",
    },
  },
  required: ["title", "description", "skills"],
};

/**
 * POST /api/extract/posting
 * Extracts posting information from unstructured text using Gemini
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

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json(
        {
          error: "Please provide more text to extract posting information from",
        },
        { status: 400 },
      );
    }

    const extractedPosting = await generateStructuredJSON({
      systemPrompt: `You are an expert at extracting posting requirements from unstructured text.
Extract as much relevant information as possible from the provided text, which could be:
- A Slack/Discord message looking for collaborators
- A project idea description
- A GitHub repository README
- A hackathon project pitch
- Any text describing a posting that needs collaborators

Be thorough in extracting skills - look for programming languages, frameworks, tools, and technologies.
Categorize the posting as study, hackathon, personal, professional, or social based on context.
Infer team size range from context if not explicitly stated.
Create a clear, concise title if one isn't provided.
Return only the extracted data, do not make up information that cannot be inferred.`,
      userPrompt: `Extract posting information from this text:\n\n${text}`,
      schema: postingSchema,
      temperature: 0.3,
    });

    return NextResponse.json({
      success: true,
      posting: extractedPosting,
    });
  } catch (error) {
    console.error("Posting extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract posting",
      },
      { status: 500 },
    );
  }
}
