import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";

/**
 * Profile extraction schema for Gemini structured output
 */
const profileSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    full_name: {
      type: SchemaType.STRING,
      description: "The person's full name",
    },
    headline: {
      type: SchemaType.STRING,
      description:
        "A short professional headline (e.g., 'Full-stack Developer' or 'Senior React Engineer')",
    },
    bio: {
      type: SchemaType.STRING,
      description: "A brief bio or summary about the person",
    },
    location: {
      type: SchemaType.STRING,
      description: "Location or timezone if mentioned",
    },
    experience_level: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["junior", "intermediate", "senior", "lead"],
      description:
        "Inferred experience level based on years of experience and skills",
    },
    collaboration_style: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["async", "sync", "hybrid"],
      description:
        "Preferred collaboration style if mentioned, default to 'async'",
    },
    availability_hours: {
      type: SchemaType.NUMBER,
      description: "Hours per week available for projects",
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
      description: "Areas of interest (e.g., AI, fintech, gaming, education)",
    },
    portfolio_url: {
      type: SchemaType.STRING,
      description: "Portfolio website URL if mentioned",
    },
    github_url: {
      type: SchemaType.STRING,
      description: "GitHub profile URL if mentioned",
    },
    project_preferences: {
      type: SchemaType.OBJECT,
      properties: {
        project_types: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description:
            "Types of projects interested in (e.g., SaaS, hackathon, open source)",
        },
        preferred_roles: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description:
            "Preferred roles (e.g., Frontend, Backend, Full-stack, DevOps)",
        },
        preferred_stack: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Preferred tech stack",
        },
        commitment_level: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["5", "10", "15", "20"],
          description: "Hours per week commitment preference",
        },
        timeline_preference: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["weekend", "1_week", "1_month", "ongoing"],
          description: "Preferred project timeline",
        },
      },
    },
  },
  required: ["skills"],
};

/**
 * POST /api/extract/profile
 * Extracts profile information from unstructured text using Gemini
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
          error: "Please provide more text to extract profile information from",
        },
        { status: 400 },
      );
    }

    const extractedProfile = await generateStructuredJSON({
      systemPrompt: `You are an expert at extracting developer profile information from unstructured text.
Extract as much relevant information as possible from the provided text, which could be:
- A GitHub profile README
- A LinkedIn bio
- A personal introduction
- A resume snippet
- Any text describing a developer

Be thorough in extracting skills - look for programming languages, frameworks, tools, and technologies.
Infer experience level from context (years of experience, complexity of projects mentioned).
If information is not explicitly stated, make reasonable inferences based on context.
Return only the extracted data, do not make up information that cannot be inferred.`,
      userPrompt: `Extract profile information from this text:\n\n${text}`,
      schema: profileSchema,
      temperature: 0.3,
    });

    return NextResponse.json({
      success: true,
      profile: extractedProfile,
    });
  } catch (error) {
    console.error("Profile extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract profile",
      },
      { status: 500 },
    );
  }
}
