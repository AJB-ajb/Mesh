import { withAuth, type OptionalAuthContext } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const POST = withAuth(
  { authMode: "optional" },
  async (request: Request, ctx: OptionalAuthContext) => {
    const { supabase } = ctx;

    const formData = await request.formData();
    const file = formData.get("screenshot") as File | null;

    if (!file) {
      return apiError("VALIDATION", "No screenshot file provided", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError(
        "VALIDATION",
        "Screenshot must be PNG, JPEG, or WebP",
        400,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return apiError("VALIDATION", "Screenshot must be under 5 MB", 400);
    }

    const ext =
      file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from("feedback-screenshots")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
      });

    if (error) {
      console.error("Screenshot upload error:", JSON.stringify(error));
      Sentry.captureException(error, {
        extra: {
          bucket: "feedback-screenshots",
          fileName,
          contentType: file.type,
          fileSize: file.size,
        },
      });
      return apiError("INTERNAL", `Upload failed: ${error.message}`, 500);
    }

    const { data: urlData } = supabase.storage
      .from("feedback-screenshots")
      .getPublicUrl(fileName);

    return apiSuccess({ url: urlData.publicUrl }, 201);
  },
);
