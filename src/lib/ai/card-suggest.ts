/**
 * Fused detect-and-suggest: single LLM call that both detects coordination
 * intent AND generates prefilled card data from calendars + profiles.
 *
 * Replaces the separate card-detection.ts for richer suggestions.
 * Uses Flash Lite for low latency (~500ms total).
 */

import { SchemaType, type ObjectSchema } from "@google/generative-ai";
import { generateStructuredJSON } from "./gemini";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SuggestedCardType =
  | "poll"
  | "time_proposal"
  | "rsvp"
  | "task_claim"
  | "location"
  | null;

export interface SuggestedSlot {
  label: string; // "Fri Mar 21, 19:00"
  start: string; // ISO datetime
  end: string; // ISO datetime
}

export interface CardSuggestion {
  suggested_type: SuggestedCardType;
  confidence: number;
  reason: string;
  prefill: {
    title?: string;
    question?: string;
    options?: string[];
    description?: string;
    slots?: SuggestedSlot[];
    duration_minutes?: number;
    is_specific_time?: boolean;
    suggested_threshold?: number;
    member_notes?: Record<string, string>; // userId → private note
  };
}

/** Context about Space members for the LLM */
export interface MemberContext {
  user_id: string;
  name: string;
  hidden_text: string | null; // extracted ||hidden|| from profile
  timezone: string | null;
}

/** Calendar overlap window formatted for the prompt */
export interface OverlapWindow {
  label: string; // "Tue Mar 18: 2:00 PM - 6:00 PM"
  start: string; // ISO
  end: string; // ISO
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

function suggestSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      suggested_type: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["poll", "time_proposal", "rsvp", "task_claim", "none"],
        description:
          "The card type to suggest. 'none' if no coordination card would help.",
      },
      confidence: {
        type: SchemaType.NUMBER,
        description: "0-1 confidence that a card would actually help here",
      },
      reason: {
        type: SchemaType.STRING,
        description:
          "Brief explanation for the suggestion chip (e.g. 'Schedule a meeting')",
      },
      title: {
        type: SchemaType.STRING,
        description:
          "Card title (time_proposal, rsvp) or poll question. Keep concise.",
      },
      options: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description:
          "Poll options, task claim roles, or location name. NOT time slots (use slots instead).",
      },
      description: {
        type: SchemaType.STRING,
        description: "For task_claim: the task description",
      },
      slots: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            label: {
              type: SchemaType.STRING,
              description: "Human-readable label, e.g. 'Fri Mar 21, 19:00'",
            },
            start: {
              type: SchemaType.STRING,
              description: "ISO 8601 datetime for slot start",
            },
            end: {
              type: SchemaType.STRING,
              description: "ISO 8601 datetime for slot end",
            },
          },
          required: ["label", "start", "end"],
        },
        description:
          "Time slots for time_proposal or rsvp. Generated from calendar overlap.",
      },
      duration_minutes: {
        type: SchemaType.NUMBER,
        description:
          "Inferred activity duration in minutes (coffee=30, dinner=120, call=15)",
      },
      is_specific_time: {
        type: SchemaType.BOOLEAN,
        description:
          "True if the message specifies an exact time (→ RSVP, not time_proposal)",
      },
      suggested_threshold: {
        type: SchemaType.NUMBER,
        description: "Suggested RSVP threshold (default: ceil(members * 0.6))",
      },
      member_notes_json: {
        type: SchemaType.STRING,
        description:
          'JSON object of per-member scheduling notes keyed by user_id. E.g. {"abc123": "Your meeting ends at 18:30"}. Empty string if no notes.',
      },
    },
    required: ["suggested_type", "confidence", "reason"],
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(hasCalendarData: boolean): string {
  const calendarInstructions = hasCalendarData
    ? `
TIME SLOT GENERATION:
When suggesting time_proposal, generate 2-5 slots from the CALENDAR OVERLAP provided.
- Infer duration from activity type (coffee → 30-45 min, dinner → 2h, call → 15-30 min, study → 2-3h)
- Apply scheduling preferences (from ||hidden|| profile text) as soft constraints
- Context-aware filtering (no early morning tennis, no late-night hiking)
- Distribute slots across different days/times when overlap is wide
- Round to 15-minute boundaries
- Use the exact ISO format from the overlap windows for start/end

MEMBER NOTES:
For each member with non-obvious constraints, generate a one-line private note.
Read their scheduling preferences and calendar context. Examples:
- "Your meeting ends at 18:30, ~30 min buffer → ready by 19:00"
- "You're free all afternoon ✓"
- "~40 min commute from Garching → arrive by 19:40"
Only generate notes when there's something useful to say. Skip if no constraints.

SPECIFIC TIME DETECTION:
If the message specifies an exact time (e.g. "at 2pm", "tomorrow at 3"):
- If all members' calendars show they're free at that time: set is_specific_time=true, type=rsvp, return single slot
- If some members have conflicts: set is_specific_time=false, type=time_proposal, return the specific time PLUS 2-3 alternatives`
    : `
TIME SLOTS:
No calendar data available. Extract any times mentioned in messages as text-only options.
Set is_specific_time=true if an exact time is specified.`;

  return `You detect coordination intent in group chat messages and suggest structured cards with prefilled data.

CARD TYPE RULES:
- "who wants X?" / "who can X?" → task_claim (volunteering for roles, not voting)
- "what should we X?" / "which option?" → poll (group decides one answer)
- "when should we X?" / scheduling question → time_proposal (pick from time slots)
- "let's do X at Y" / specific time stated → rsvp (confirm attendance, time already decided)
- location questions → currently not suggested (return type "none")

IMPORTANT DISTINCTIONS:
- task_claim vs poll: "who wants to do X?" = task_claim (people claim items). "What should we do?" = poll (group votes).
- time_proposal vs rsvp: "when should we meet?" = time_proposal (negotiate). "let's meet at 3" = rsvp (confirm).
${calendarInstructions}

RSVP THRESHOLD:
For RSVPs, set suggested_threshold to ceil(member_count * 0.6).

GENERAL RULES:
- Only suggest a card if the intent is CLEAR (confidence > 0.6)
- If messages are just casual chat, return type "none"
- Be conservative — false negatives are better than false positives
- Keep titles concise and natural
- Pre-fill as much as possible from the conversation context`;
}

function buildUserPrompt(
  messages: { sender_name: string; content: string }[],
  members: MemberContext[],
  overlap: OverlapWindow[] | null,
  now: string,
): string {
  const parts: string[] = [];

  parts.push("RECENT MESSAGES:");
  parts.push(messages.map((m) => `${m.sender_name}: ${m.content}`).join("\n"));

  parts.push(`\nSPACE CONTEXT:`);
  parts.push(
    `Members (${members.length}): ${members.map((m) => m.name).join(", ")}`,
  );

  if (overlap && overlap.length > 0) {
    parts.push(`\nCALENDAR OVERLAP (next 14 days):`);
    parts.push(overlap.map((w) => w.label).join("\n"));
  } else if (overlap) {
    parts.push(`\nCALENDAR OVERLAP: No mutual free windows found`);
  }

  // Include hidden profile text for scheduling preferences
  const membersWithPrefs = members.filter((m) => m.hidden_text);
  if (membersWithPrefs.length > 0) {
    parts.push(`\nMEMBER SCHEDULING PREFERENCES (from ||hidden|| profile):`);
    for (const m of membersWithPrefs) {
      parts.push(`${m.name} (${m.user_id}): ${m.hidden_text}`);
    }
  }

  parts.push(`\nCURRENT TIME: ${now}`);

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseMemberNotes(
  json: string | undefined,
): Record<string, string> | undefined {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, string>;
    }
  } catch {
    // LLM returned invalid JSON — ignore
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function detectAndSuggest(
  messages: { sender_name: string; content: string }[],
  members: MemberContext[],
  overlap: OverlapWindow[] | null,
): Promise<CardSuggestion> {
  const hasCalendarData = overlap !== null && overlap.length > 0;

  const raw = await generateStructuredJSON<{
    suggested_type: string;
    confidence: number;
    reason: string;
    title?: string;
    options?: string[];
    description?: string;
    slots?: Array<{ label: string; start: string; end: string }>;
    duration_minutes?: number;
    is_specific_time?: boolean;
    suggested_threshold?: number;
    member_notes_json?: string;
  }>({
    systemPrompt: buildSystemPrompt(hasCalendarData),
    userPrompt: buildUserPrompt(
      messages,
      members,
      overlap,
      new Date().toISOString(),
    ),
    schema: suggestSchema(),
    tier: "fast",
  });

  const suggestedType =
    raw.suggested_type === "none"
      ? null
      : (raw.suggested_type as SuggestedCardType);

  return {
    suggested_type: suggestedType,
    confidence: raw.confidence,
    reason: raw.reason,
    prefill: {
      title: raw.title,
      question: raw.title, // polls use question, time/rsvp use title
      options: raw.options,
      description: raw.description,
      slots: raw.slots,
      duration_minutes: raw.duration_minutes,
      is_specific_time: raw.is_specific_time,
      suggested_threshold: raw.suggested_threshold,
      member_notes: parseMemberNotes(raw.member_notes_json),
    },
  };
}
