/**
 * Centralized system prompts for AI extraction routes.
 *
 * Each constant is a complete system prompt passed to Gemini.
 * Common instructions are shared via a builder to avoid duplication.
 */

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------

const COMMON_EXTRACT_RULES = `Return only the extracted data, do not make up information that cannot be inferred.`;

const COMMON_UPDATE_RULES = `Preserve all original information unless explicitly contradicted by the update. Integrate changes naturally into the text.`;

function buildExtractPrompt(entityInstructions: string): string {
  return `${entityInstructions}\n\n${COMMON_EXTRACT_RULES}`;
}

function buildUpdatePrompt(entityInstructions: string): string {
  return `${entityInstructions}\n\n${COMMON_UPDATE_RULES}\n\nReturn both the updated text and extracted fields.`;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const PROFILE_EXTRACT_SYSTEM_PROMPT = buildExtractPrompt(
  `You are an expert at extracting developer profile information from unstructured text.
Extract as much relevant information as possible from the provided text, which could be:
- A GitHub profile README
- A LinkedIn bio
- A personal introduction
- A resume snippet
- Any text describing a developer

Be thorough in extracting skills - look for programming languages, frameworks, tools, and technologies.
If information is not explicitly stated, make reasonable inferences based on context.`,
);

export const PROFILE_UPDATE_SYSTEM_PROMPT = buildUpdatePrompt(
  `You are an expert at updating developer profile descriptions and extracting structured data.

You will receive a current profile description and an update instruction. Your job:
1. Apply the update instruction to the profile text.
2. Extract structured profile fields from the UPDATED text.

For the skill_levels field, output a JSON-encoded string mapping domain names to numeric skill levels (0-10).`,
);

// ---------------------------------------------------------------------------
// Posting
// ---------------------------------------------------------------------------

export const POSTING_EXTRACT_SYSTEM_PROMPT = buildExtractPrompt(
  `You are an expert at extracting posting requirements from unstructured text.
Extract as much relevant information as possible from the provided text, which could be:
- A Slack/Discord message looking for collaborators
- A project idea description
- A GitHub repository README
- A hackathon project pitch
- Any text describing a posting that needs collaborators

Be thorough in extracting skills - look for programming languages, frameworks, tools, and technologies.
Categorize the posting as study, hackathon, personal, professional, or social based on context.
Infer team size range from context if not explicitly stated.
Create a clear, concise title if one isn't provided.`,
);

export const POSTING_UPDATE_SYSTEM_PROMPT = buildUpdatePrompt(
  `You are an expert at updating project posting descriptions and extracting structured data.

You will receive a current posting description and an update instruction. Your job:
1. Apply the update instruction to the posting text.
2. Extract structured posting fields from the UPDATED text.`,
);
