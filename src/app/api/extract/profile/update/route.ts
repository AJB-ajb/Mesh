import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";

/**
 * Extraction schema matching the post-redesign DB columns.
 * Note: skill_levels is represented as a JSON string because Gemini SDK
 * doesn't support additionalProperties on ObjectSchema.
 */
const profileSchemaV2: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    updated_text: {
      type: SchemaType.STRING,
      description:
        "The full updated source text with the update instruction applied. Preserve all original information unless explicitly contradicted.",
    },
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
  },
  required: ["updated_text", "skills"],
};

/**
 * POST /api/extract/profile/update
 * Applies a free-form update instruction to the profile source text,
 * then extracts structured fields from the result.
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

    const { sourceText, updateInstruction } = await request.json();

    if (
      !sourceText ||
      typeof sourceText !== "string" ||
      sourceText.trim().length < 5
    ) {
      return NextResponse.json(
        { error: "Please provide source text to update" },
        { status: 400 },
      );
    }

    if (
      !updateInstruction ||
      typeof updateInstruction !== "string" ||
      updateInstruction.trim().length < 3
    ) {
      return NextResponse.json(
        { error: "Please provide an update instruction" },
        { status: 400 },
      );
    }

    const result = await generateStructuredJSON<Record<string, unknown>>({
      systemPrompt: `You are an expert at updating developer profile descriptions and extracting structured data.

You will receive a current profile description and an update instruction. Your job:
1. Apply the update instruction to the profile text. Preserve all original information unless explicitly contradicted by the update. Integrate changes naturally into the text.
2. Extract structured profile fields from the UPDATED text.

For the skill_levels field, output a JSON-encoded string mapping domain names to numeric skill levels (0-10).

Return both the updated text and extracted fields.`,
      userPrompt: `Current profile description:\n\n${sourceText.trim()}\n\nUpdate instruction: ${updateInstruction.trim()}`,
      schema: profileSchemaV2,
      temperature: 0.3,
    });

    // Parse skill_levels from JSON string back to object
    if (typeof result.skill_levels === "string") {
      try {
        result.skill_levels = JSON.parse(result.skill_levels as string);
      } catch {
        // If parsing fails, leave as-is — downstream code can handle it
      }
    }

    const { updated_text, ...extractedProfile } = result;

    return NextResponse.json({
      success: true,
      updatedSourceText: updated_text,
      extractedProfile,
    });
  } catch (error) {
    console.error("Profile update extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      },
      { status: 500 },
    );
  }
}
