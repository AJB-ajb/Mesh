import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";

const postingUpdateSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    updated_text: {
      type: SchemaType.STRING,
      description:
        "The full updated source text with the update instruction applied. Preserve all original information unless explicitly contradicted.",
    },
    title: {
      type: SchemaType.STRING,
      description: "The posting title",
    },
    description: {
      type: SchemaType.STRING,
      description: "The posting description",
    },
    skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of required skills, languages, frameworks, and tools",
    },
    category: {
      type: SchemaType.STRING,
      description:
        "Posting category: study, hackathon, personal, professional, or social",
    },
    estimated_time: {
      type: SchemaType.STRING,
      description: "Estimated time commitment (e.g., '2 weeks', '1 month')",
    },
    team_size_max: {
      type: SchemaType.NUMBER,
      description: "Maximum team size (number of people needed)",
    },
    skill_level_min: {
      type: SchemaType.NUMBER,
      description: "Minimum skill level required (0-10 scale)",
    },
    tags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "Free-form tags for discovery (e.g., beginner-friendly, weekend, remote)",
    },
    context_identifier: {
      type: SchemaType.STRING,
      description:
        "Course code, hackathon name, or group identifier for exact-match filtering",
    },
    mode: {
      type: SchemaType.STRING,
      description: "Posting mode: open or friend_ask",
    },
  },
  required: ["updated_text", "skills"],
};

/**
 * POST /api/extract/posting/update
 * Applies a free-form update instruction to the posting source text,
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

    const { postingId, sourceText, updateInstruction } = await request.json();

    if (!postingId || typeof postingId !== "string") {
      return NextResponse.json(
        { error: "postingId is required" },
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

    // Verify ownership
    const { data: posting, error: postingError } = await supabase
      .from("postings")
      .select(
        "creator_id, title, description, skills, category, estimated_time, team_size_max, skill_level_min, tags, context_identifier, mode",
      )
      .eq("id", postingId)
      .single();

    if (postingError || !posting) {
      return NextResponse.json({ error: "Posting not found" }, { status: 404 });
    }

    if (posting.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build effective source text
    let effectiveSourceText = "";
    if (
      sourceText &&
      typeof sourceText === "string" &&
      sourceText.trim().length >= 5
    ) {
      effectiveSourceText = sourceText.trim();
    } else {
      const parts: string[] = [];
      if (posting.title) parts.push(`Title: ${posting.title}`);
      if (posting.description)
        parts.push(`Description: ${posting.description}`);
      if (posting.skills?.length)
        parts.push(`Skills: ${posting.skills.join(", ")}`);
      if (posting.category) parts.push(`Category: ${posting.category}`);
      if (posting.estimated_time)
        parts.push(`Estimated time: ${posting.estimated_time}`);
      if (posting.team_size_max)
        parts.push(`Team size: ${posting.team_size_max}`);
      if (posting.skill_level_min != null)
        parts.push(`Min skill level: ${posting.skill_level_min}`);
      if (posting.tags?.length) parts.push(`Tags: ${posting.tags.join(", ")}`);
      if (posting.context_identifier)
        parts.push(`Context: ${posting.context_identifier}`);
      if (posting.mode) parts.push(`Mode: ${posting.mode}`);
      effectiveSourceText = parts.join("\n");

      if (!effectiveSourceText) {
        effectiveSourceText = "New posting with no existing information.";
      }
    }

    const result = await generateStructuredJSON<Record<string, unknown>>({
      systemPrompt: `You are an expert at updating project posting descriptions and extracting structured data.

You will receive a current posting description and an update instruction. Your job:
1. Apply the update instruction to the posting text. Preserve all original information unless explicitly contradicted by the update. Integrate changes naturally into the text.
2. Extract structured posting fields from the UPDATED text.

Return both the updated text and extracted fields.`,
      userPrompt: `Current posting description:\n\n${effectiveSourceText}\n\nUpdate instruction: ${updateInstruction.trim()}`,
      schema: postingUpdateSchema,
      temperature: 0.3,
    });

    const { updated_text, ...extractedPosting } = result;

    return NextResponse.json({
      success: true,
      updatedSourceText: updated_text,
      extractedPosting,
    });
  } catch (error) {
    console.error("Posting update extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update posting",
      },
      { status: 500 },
    );
  }
}
