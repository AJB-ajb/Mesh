/**
 * Prompt templates for acceptance card generation.
 */

import type { QuestionBlock } from "@/lib/hidden-syntax";

export const ACCEPTANCE_CARD_SYSTEM_PROMPT = `You generate a structured acceptance card for someone joining an activity.
Read the posting, both profiles, and the calendar data. Decide what to ask.

Rules:
- If time is already specified exactly (e.g. "Saturday 3pm"): set skip_time=true, leave time_slots empty
- If time is vague ("sometime next week") or unspecified: generate 2-5 smart time slots from the mutual free windows
- If roles are mentioned ("frontend dev and designer"): generate role options
- Convert provided poster questions (from ||?|| syntax) to appropriate form types (text, yes_no, select)
- Infer additional questions only when clearly needed (e.g. "musicians" -> "instrument?")
- Keep inferred questions to a minimum — only when the posting strongly implies a question
- Consider scheduling preferences from both profiles' hidden text (commute, buffers, time-of-day)
- For outdoor activities, prefer daylight hours; for social, prefer evenings; use common sense
- Round times to 15-minute boundaries
- Include brief rationale per time slot when non-obvious constraints are at play
- Generate deterministic question IDs: "q_" + first 8 chars of a simple hash of the question text
- Set inferred_duration_minutes based on the activity type and any time hints in the posting`;

export function buildAcceptanceCardUserPrompt(input: {
  postingDescription: string;
  category: string | null;
  teamSizeMin: number;
  teamSizeMax: number;
  timeInfo: string;
  posterSourceText: string | null;
  candidateSourceText: string | null;
  overlapWindows: string;
  committedTime: string;
  parsedQuestions: QuestionBlock[];
  now: string;
  date: string;
}): string {
  const questionsText =
    input.parsedQuestions.length > 0
      ? input.parsedQuestions
          .map((q, i) => `${i + 1}. ${q.question}`)
          .join("\n")
      : "none";

  return `POSTING:
${input.postingDescription}
Activity type: ${input.category || "general"}
Team size: ${input.teamSizeMin}-${input.teamSizeMax}
Time constraint: ${input.timeInfo || "none specified"}

POSTER'S PROFILE:
${input.posterSourceText || "No profile text available"}

CANDIDATE'S PROFILE:
${input.candidateSourceText || "No profile text available"}

MUTUAL FREE WINDOWS (next 2 weeks):
${input.overlapWindows || "No calendar data available"}

EXISTING COMMITTED TIME: ${input.committedTime}

POSTER-DEFINED QUESTIONS (from ||?|| syntax):
${questionsText}

Current time: ${input.now}
Date: ${input.date}`;
}
