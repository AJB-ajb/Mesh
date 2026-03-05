import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess, AppError } from "@/lib/errors";
import { getPosting, getProfile } from "@/lib/data";
import { parseQuestionBlocks } from "@/lib/hidden-syntax";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";
import {
  ACCEPTANCE_CARD_SYSTEM_PROMPT,
  buildAcceptanceCardUserPrompt,
} from "@/lib/ai/acceptance-card-prompt";
import { acceptanceCardResponseSchema } from "@/lib/ai/acceptance-card-schema";
import {
  windowsToConcreteDates,
  formatSlotsForPrompt,
} from "@/lib/calendar/overlap-to-slots";
import type { AcceptanceCardData } from "@/lib/types/acceptance-card";
import type { CommonAvailabilityWindow } from "@/lib/types/scheduling";

/** Minimal fallback card when Gemini is unavailable or unnecessary. */
function minimalCard(): AcceptanceCardData {
  return {
    skip_time: true,
    time_slots: [],
    questions: [],
    roles: [],
  };
}

export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  // 1. Fetch posting
  const posting = await getPosting(supabase, postingId);
  if (!posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id === user.id) {
    throw new AppError("VALIDATION", "Cannot join your own posting", 400);
  }

  // 2. If Gemini is not configured, return minimal card
  if (!isGeminiConfigured()) {
    return apiSuccess<AcceptanceCardData>(minimalCard());
  }

  // 3. Fetch poster + candidate profiles
  const [posterProfile, candidateProfile] = await Promise.all([
    getProfile(supabase, posting.creator_id),
    getProfile(supabase, user.id),
  ]);

  // 4. Parse ||?|| blocks from posting description
  const description = posting.description || "";
  const parsedQuestions = parseQuestionBlocks(description);

  // 5. Check for existing confirmed meeting time
  const { data: confirmedProposals } = await supabase
    .from("meeting_proposals")
    .select("start_time, end_time, title")
    .eq("posting_id", postingId)
    .eq("status", "confirmed")
    .limit(1);

  const confirmedTime = confirmedProposals?.[0] ?? null;

  // 6. Compute mutual free windows (poster x candidate)
  let overlapWindows: CommonAvailabilityWindow[] = [];
  try {
    const { data: windows } = await supabase.rpc(
      "get_team_common_availability",
      { p_profile_ids: [posting.creator_id, user.id] },
    );
    overlapWindows = (windows as CommonAvailabilityWindow[]) ?? [];
  } catch {
    // Calendar data unavailable — proceed without it
  }

  // 7. Convert to concrete date slots
  const now = new Date();
  const concreteSlots = windowsToConcreteDates(overlapWindows, now, 14);
  const slotsPromptText = formatSlotsForPrompt(concreteSlots);

  // 8. Build committed time string
  const committedTimeStr = confirmedTime
    ? `${confirmedTime.start_time} to ${confirmedTime.end_time}`
    : "none";

  // 9. Call Gemini
  try {
    const cardData = await generateStructuredJSON<AcceptanceCardData>({
      systemPrompt: ACCEPTANCE_CARD_SYSTEM_PROMPT,
      userPrompt: buildAcceptanceCardUserPrompt({
        postingDescription: description,
        category: posting.category ?? null,
        teamSizeMin: posting.team_size_min ?? 1,
        teamSizeMax: posting.team_size_max ?? 10,
        timeInfo: posting.source_text ?? "",
        posterSourceText: posterProfile?.source_text ?? null,
        candidateSourceText: candidateProfile?.source_text ?? null,
        overlapWindows: slotsPromptText,
        committedTime: committedTimeStr,
        parsedQuestions,
        now: now.toISOString(),
        date: now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      }),
      schema: acceptanceCardResponseSchema(),
      temperature: 0.3,
    });

    // Overlay confirmed_time if it exists
    if (confirmedTime) {
      cardData.confirmed_time = {
        start: confirmedTime.start_time,
        end: confirmedTime.end_time,
        label:
          confirmedTime.title ||
          new Date(confirmedTime.start_time).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
      };
      cardData.skip_time = true;
      cardData.time_slots = [];
    }

    return apiSuccess<AcceptanceCardData>(cardData);
  } catch (error) {
    // Gemini unavailable — graceful fallback
    console.warn("Acceptance card generation failed, using fallback:", error);

    // Return a minimal card with parsed questions only (deterministic)
    const fallbackCard = minimalCard();
    fallbackCard.questions = parsedQuestions.map((q, i) => ({
      id: `q_${i}_${q.question.slice(0, 8).replace(/\s/g, "_")}`,
      question: q.question,
      type: "text" as const,
      source: "poster" as const,
    }));
    return apiSuccess<AcceptanceCardData>(fallbackCard);
  }
});
