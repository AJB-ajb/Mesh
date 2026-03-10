import { withAuth } from "@/lib/api/with-auth";
import { logFireAndForget } from "@/lib/api/fire-and-forget";
import { notifyIfPreferred } from "@/lib/api/notify-if-preferred";
import { apiSuccess, AppError } from "@/lib/errors";
import { getPosting, getProfile } from "@/lib/data";
import { generateStructuredJSON, isGeminiConfigured } from "@/lib/ai/gemini";
import { SchemaType } from "@google/generative-ai";

/**
 * POST /api/postings/[id]/resolve-time
 *
 * Called internally after an application with time_selection is created.
 * Checks if team members converge on a time slot and optionally auto-commits.
 */
export const POST = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  // 1. Fetch posting
  const posting = await getPosting(supabase, postingId);
  if (!posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  // Only poster can trigger resolution
  if (posting.creator_id !== user.id) {
    throw new AppError("FORBIDDEN", "Only the poster can resolve time", 403);
  }

  // 2. Check if already confirmed
  const { data: existing } = await supabase
    .from("meeting_proposals")
    .select("id")
    .eq("posting_id", postingId)
    .eq("status", "confirmed")
    .limit(1);

  if (existing && existing.length > 0) {
    return apiSuccess({ status: "already_confirmed" });
  }

  // 3. Fetch all applications with time_selection responses
  const { data: applications } = await supabase
    .from("applications")
    .select("id, applicant_id, responses, status")
    .eq("posting_id", postingId)
    .in("status", ["accepted", "pending"]);

  if (!applications || applications.length === 0) {
    return apiSuccess({ status: "no_applications" });
  }

  // Filter applications that have time selections
  const withTimeSelections = applications.filter(
    (app) =>
      app.responses &&
      typeof app.responses === "object" &&
      (app.responses as Record<string, unknown>).time_selection,
  );

  if (withTimeSelections.length === 0) {
    return apiSuccess({ status: "no_time_selections" });
  }

  // 4. Aggregate slot frequencies
  const slotCounts = new Map<string, string[]>(); // slot ISO -> applicant_ids

  for (const app of withTimeSelections) {
    const timeSelection = (app.responses as Record<string, unknown>)
      .time_selection as { slots: string[] };
    for (const slot of timeSelection.slots) {
      const existing = slotCounts.get(slot) ?? [];
      existing.push(app.applicant_id);
      slotCounts.set(slot, existing);
    }
  }

  // 5. Check for convergence: a slot all time-selecting members agree on
  const totalWithTime = withTimeSelections.length;
  const unanimousSlots = Array.from(slotCounts.entries())
    .filter(([, members]) => members.length === totalWithTime)
    .map(([slot, members]) => ({ slot, members }));

  // Check team_size_min
  const acceptedCount = applications.filter(
    (a) => a.status === "accepted",
  ).length;
  const minReached = acceptedCount >= (posting.team_size_min ?? 1);

  if (unanimousSlots.length === 0 || !minReached) {
    // No convergence or team too small — return aggregation for poster
    const aggregation = Array.from(slotCounts.entries()).map(
      ([slot, members]) => ({
        slot,
        count: members.length,
        total: totalWithTime,
      }),
    );

    return apiSuccess({
      status: "no_convergence",
      aggregation,
      total_with_time: totalWithTime,
      min_reached: minReached,
    });
  }

  // 6. Pick best slot (highest agreement, earliest)
  const bestSlot = unanimousSlots[0].slot;

  // 7. Auto-commit check via LLM (if configured)
  let shouldAutoCommit = true;

  if (isGeminiConfigured()) {
    try {
      const posterProfile = await getProfile(supabase, posting.creator_id);
      const result = await generateStructuredJSON<{
        auto_commit: boolean;
        reason: string;
      }>({
        systemPrompt:
          "You decide whether to auto-confirm a meeting time. If the poster's profile or posting text indicates they want to review times manually, set auto_commit=false. Otherwise set auto_commit=true.",
        userPrompt: `Posting: ${posting.description || posting.title}\n\nPoster profile: ${posterProfile?.source_text || "No profile"}\n\nProposed time: ${bestSlot}\n\nAll members agree on this time. Should it be auto-confirmed?`,
        schema: {
          type: SchemaType.OBJECT,
          properties: {
            auto_commit: {
              type: SchemaType.BOOLEAN,
              description: "Whether to auto-confirm",
            },
            reason: {
              type: SchemaType.STRING,
              description: "Brief reason",
            },
          },
          required: ["auto_commit", "reason"],
        },
        temperature: 0.1,
        tier: "fast",
      });

      shouldAutoCommit = result.auto_commit;
    } catch {
      // LLM unavailable — default to auto-commit
    }
  }

  if (!shouldAutoCommit) {
    return apiSuccess({
      status: "manual_review_needed",
      best_slot: bestSlot,
      reason: "Poster prefers to review times manually",
    });
  }

  // 8. Auto-commit: create confirmed meeting proposal
  const slotDate = new Date(bestSlot);
  const durationMinutes =
    (withTimeSelections[0].responses as Record<string, unknown>)
      .time_selection &&
    typeof (
      (withTimeSelections[0].responses as Record<string, unknown>)
        .time_selection as Record<string, unknown>
    ).duration_minutes === "number"
      ? (
          (withTimeSelections[0].responses as Record<string, unknown>)
            .time_selection as { duration_minutes: number }
        ).duration_minutes
      : 60;
  const endDate = new Date(slotDate.getTime() + durationMinutes * 60_000);

  const { error: proposalError } = await supabase
    .from("meeting_proposals")
    .insert({
      posting_id: postingId,
      proposed_by: posting.creator_id,
      title: `${posting.title} - Auto-confirmed`,
      start_time: slotDate.toISOString(),
      end_time: endDate.toISOString(),
      status: "confirmed",
    });

  if (proposalError) {
    throw new AppError("INTERNAL", "Failed to create meeting proposal", 500);
  }

  // 9. Notify all accepted members
  for (const app of applications.filter((a) => a.status === "accepted")) {
    logFireAndForget(
      notifyIfPreferred(supabase, app.applicant_id, "interest_received", {
        userId: app.applicant_id,
        type: "meeting_confirmed",
        title: "Meeting Confirmed",
        body: `Your activity "${posting.title}" is confirmed for ${slotDate.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
        relatedPostingId: postingId,
      }),
      "resolve-time-meeting-confirmed",
    );
  }

  return apiSuccess({
    status: "confirmed",
    start_time: slotDate.toISOString(),
    end_time: endDate.toISOString(),
  });
});
