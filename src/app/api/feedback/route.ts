import { withAuth, type OptionalAuthContext } from "@/lib/api/with-auth";
import { apiError, apiSuccess, AppError, parseBody } from "@/lib/errors";
import type { FeedbackMood, FeedbackMetadata } from "@/lib/supabase/types";

const VALID_MOODS: FeedbackMood[] = ["frustrated", "neutral", "happy"];
const MAX_MESSAGE_LENGTH = 5000;

export const POST = withAuth(
  { authMode: "optional" },
  async (request: Request, ctx: OptionalAuthContext) => {
    const { user, supabase } = ctx;

    const body = await parseBody(request);

    const { message, mood, page_url, user_agent, screenshot_urls, metadata } =
      body as {
        message?: string;
        mood?: string;
        page_url?: string;
        user_agent?: string;
        screenshot_urls?: string[];
        metadata?: FeedbackMetadata;
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

    // Validate screenshot_urls
    if (screenshot_urls !== undefined && screenshot_urls !== null) {
      if (!Array.isArray(screenshot_urls)) {
        return apiError("VALIDATION", "screenshot_urls must be an array", 400);
      }
      if (screenshot_urls.length > 5) {
        return apiError(
          "VALIDATION",
          "screenshot_urls must contain at most 5 elements",
          400,
        );
      }
      for (const url of screenshot_urls) {
        if (typeof url !== "string" || url.trim().length === 0) {
          return apiError(
            "VALIDATION",
            "Each screenshot URL must be a non-empty string",
            400,
          );
        }
        if (!url.startsWith("http")) {
          return apiError(
            "VALIDATION",
            "Each screenshot URL must be a valid URL starting with http",
            400,
          );
        }
      }
    }

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        user_id: user?.id ?? null,
        message: message.trim(),
        mood: (mood as FeedbackMood) ?? null,
        page_url,
        user_agent: user_agent ?? null,
        screenshot_urls: screenshot_urls?.length ? screenshot_urls : null,
        metadata: metadata ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      throw new AppError(
        "INTERNAL",
        `Failed to submit feedback: ${error.message}`,
        500,
      );
    }

    return apiSuccess({ id: data.id, created_at: data.created_at }, 201);
  },
);
