import * as Sentry from "@sentry/nextjs";

const MAX_RETRIES = 2;

/**
 * Trigger embedding generation with basic retry logic.
 * Replaces the fire-and-forget `fetch(...).catch(() => {})` pattern.
 */
export async function triggerEmbeddingGeneration(
  retries = MAX_RETRIES,
): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch("/api/embeddings/process", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.EMBEDDINGS_API_KEY || process.env.SUPABASE_SECRET_KEY}`,
        },
      });
      if (response.ok) return;
    } catch {
      // Network error — retry
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  console.warn(
    "[embeddings] Failed to trigger embedding generation after retries",
  );
  Sentry.captureMessage(
    "Failed to trigger embedding generation after retries",
    {
      level: "warning",
      tags: { source: "fire-and-forget", operation: "embedding" },
    },
  );
}
