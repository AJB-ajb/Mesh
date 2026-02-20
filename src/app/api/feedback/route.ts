import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/errors";
import type { FeedbackMood } from "@/lib/supabase/types";

const VALID_MOODS: FeedbackMood[] = ["frustrated", "neutral", "happy"];
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { message, mood, page_url, user_agent } = body as {
      message?: string;
      mood?: string;
      page_url?: string;
      user_agent?: string;
    };

    // Validate required fields
    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return apiError("VALIDATION", "Message is required", 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return apiError(
        "VALIDATION",
        `Message must be ${MAX_MESSAGE_LENGTH} characters or less`,
        400,
      );
    }

    if (!page_url || typeof page_url !== "string") {
      return apiError("VALIDATION", "Page URL is required", 400);
    }

    if (mood !== undefined && mood !== null) {
      if (!VALID_MOODS.includes(mood as FeedbackMood)) {
        return apiError(
          "VALIDATION",
          `Invalid mood. Must be one of: ${VALID_MOODS.join(", ")}`,
          400,
        );
      }
    }

    const supabase = await createClient();

    // Try to get the current user (optional — anonymous feedback is allowed)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        user_id: user?.id ?? null,
        message: message.trim(),
        mood: (mood as FeedbackMood) ?? null,
        page_url,
        user_agent: user_agent ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Feedback insert error:", error);
      return apiError("INTERNAL", "Failed to save feedback", 500);
    }

    return apiSuccess({ id: data.id, created_at: data.created_at }, 201);
  } catch (error) {
    console.error("Feedback route error:", error);
    return apiError("INTERNAL", "Internal server error", 500);
  }
}
