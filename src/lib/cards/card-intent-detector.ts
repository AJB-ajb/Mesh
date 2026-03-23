import type { SpaceCardType } from "@/lib/supabase/types";

export interface CardIntentDetection {
  hasIntent: boolean;
  plausibleTypes: SpaceCardType[]; // 1-3 types, ordered by likelihood
  confidence: number; // 0-1
}

const NO_INTENT: CardIntentDetection = {
  hasIntent: false,
  plausibleTypes: [],
  confidence: 0,
};

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

interface Pattern {
  test: (text: string, hasQuestionMark: boolean) => boolean;
  types: SpaceCardType[];
  weight: number;
}

const TIME_WORDS =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight|today|next\s+week|this\s+week|this\s+weekend|next\s+weekend|when|what\s+time)\b/i;

const SPECIFIC_TIME =
  /\b(at\s+\d{1,2}(:\d{2})?\s*(am|pm)?|at\s+\d{2}:\d{2}|tomorrow\s+at\s+\d|tonight\s+at\s+\d|\d{1,2}\s*(am|pm))\b/i;

// Match comma/or-separated short options (e.g. "Italian, sushi, or Thai")
// Requires short items (≤30 chars each) to avoid matching normal sentences with commas
const COMMA_OR_OPTIONS =
  /(?:[\w\s]{1,30},\s*){2,}[\w\s]{1,30}$|[\w\s]{1,30},\s+[\w\s]{1,30},?\s+or\s+[\w\s]{1,30}/i;

const WHO_PATTERN =
  /\b(who\s+can|who\s+wants?\s+to|volunteers?|anyone\s+want)\b/i;

const LOCATION_PATTERN = /\b(where\s+should|what\s+place|which\s+location)\b/i;

const DECISION_PATTERN = /\b(should\s+we|what\s+should|which\s+one)\b/i;

const LETS_TIME_PATTERN = /\b(let'?s\s+do|let'?s\s+meet)\b/i;

const EMOJI_ONLY = /^[\s\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D]+$/u;

const patterns: Pattern[] = [
  // Question mark + time/day words
  {
    test: (text, hasQ) => hasQ && TIME_WORDS.test(text),
    types: ["time_proposal", "rsvp"],
    weight: 0.7,
  },
  // Specific time stated (no question mark required)
  {
    test: (text) => SPECIFIC_TIME.test(text),
    types: ["rsvp", "time_proposal"],
    weight: 0.8,
  },
  // Question mark + comma/or-separated items (3+ options)
  {
    test: (text, hasQ) => hasQ && COMMA_OR_OPTIONS.test(text),
    types: ["poll"],
    weight: 0.7,
  },
  // "who can", "who wants to", "volunteers", "anyone want"
  {
    test: (text) => WHO_PATTERN.test(text),
    types: ["task_claim"],
    weight: 0.7,
  },
  // "where should", "what place", "which location"
  {
    test: (text) => LOCATION_PATTERN.test(text),
    types: ["poll"],
    weight: 0.6,
  },
  // General decision question
  {
    test: (text, hasQ) => hasQ && DECISION_PATTERN.test(text),
    types: ["poll"],
    weight: 0.5,
  },
  // "let's do", "let's meet" + time word (declarative, not question)
  {
    test: (text, hasQ) =>
      !hasQ && LETS_TIME_PATTERN.test(text) && TIME_WORDS.test(text),
    types: ["rsvp", "time_proposal"],
    weight: 0.6,
  },
  // "let's do", "let's meet" + specific time (declarative)
  {
    test: (text, hasQ) =>
      !hasQ && LETS_TIME_PATTERN.test(text) && SPECIFIC_TIME.test(text),
    types: ["rsvp", "time_proposal"],
    weight: 0.8,
  },
];

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function detectCardIntent(text: string): CardIntentDetection {
  // Very short text → no intent
  if (text.length < 5) return NO_INTENT;

  // Pure emoji-only → no intent
  if (EMOJI_ONLY.test(text)) return NO_INTENT;

  const hasQuestionMark = text.includes("?");

  let maxWeight = 0;
  const typesOrdered: SpaceCardType[] = [];

  for (const pattern of patterns) {
    if (pattern.test(text, hasQuestionMark)) {
      if (pattern.weight > maxWeight) {
        maxWeight = pattern.weight;
      }
      // Add types in order, deduplicating
      for (const t of pattern.types) {
        if (!typesOrdered.includes(t)) {
          typesOrdered.push(t);
        }
      }
    }
  }

  // Below minimum threshold
  if (maxWeight < 0.5) return NO_INTENT;

  return {
    hasIntent: true,
    plausibleTypes: typesOrdered.slice(0, 3),
    confidence: maxWeight,
  };
}
