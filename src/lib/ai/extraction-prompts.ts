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
If information is not explicitly stated, make reasonable inferences based on context.

For availability, extract UNAVAILABILITY windows — times the person is NOT available (blocked time).
- "Busy weekday evenings" → Monday-Friday, 1080-1440 (6pm-midnight) as blocked windows
- "Not free Saturday 2-4pm" → day 5, 840-960 as a blocked window
- "Available mornings except Tuesday" → invert: Tuesday morning (360-720) is blocked
- If the text says they ARE available at certain times, invert to find blocked windows
- Days: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
- Minutes from midnight: 12am=0, 6am=360, 9am=540, 12pm=720, 3pm=900, 5pm=1020, 6pm=1080, 9pm=1260, midnight=1440
If a timezone is mentioned (e.g., "EST", "Berlin time"), extract it as an IANA timezone string.`,
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
Create a clear, concise title if one isn't provided.

For scheduling/availability:
- If no schedule mentioned → availability_mode: "flexible"
- If weekly recurring times mentioned → availability_mode: "recurring", populate availability_windows
- Convert times to minutes from midnight: 6am=360, 9am=540, 12pm=720, 5pm=1020, 6pm=1080, midnight=1440
- Days: 0=Monday, 1=Tuesday, ..., 6=Sunday
- Examples: "Tuesday and Thursday evenings" → recurring with day 1 and 3, 1080-1440
  "Weekends 10am-2pm" → day 5 and 6, 600-840
If a timezone is mentioned, extract as IANA timezone (e.g., "America/New_York").`,
);

export const POSTING_UPDATE_SYSTEM_PROMPT = buildUpdatePrompt(
  `You are an expert at updating project posting descriptions and extracting structured data.

You will receive a current posting description and an update instruction. Your job:
1. Apply the update instruction to the posting text.
2. Extract structured posting fields from the UPDATED text.`,
);
