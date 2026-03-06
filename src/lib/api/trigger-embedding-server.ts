/**
 * Server-side variant of trigger-embedding that uses an absolute URL.
 *
 * The client-side version uses a relative `/api/embeddings/process` path,
 * which only works in the browser. API routes run on the server and need
 * a fully-qualified URL.
 *
 * Callers should pass `origin` (from the incoming request) so the function
 * targets the same deployment that is handling the request.
 */

import * as Sentry from "@sentry/nextjs";

const MAX_RETRIES = 2;

export function getBaseUrl(origin?: string): string {
  if (origin) return origin;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // Stable Vercel URLs — avoid VERCEL_URL which is per-deployment and ephemeral
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_BRANCH_URL)
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function triggerEmbeddingGenerationServer(
  origin?: string,
  retries = MAX_RETRIES,
): Promise<void> {
  if (!process.env.EMBEDDINGS_API_KEY) {
    console.warn(
      "[embeddings] EMBEDDINGS_API_KEY is not set — skipping embedding trigger",
    );
    return;
  }

  const url = `${getBaseUrl(origin)}/api/embeddings/process`;
  let lastStatus: number | null = null;
  let lastBody: string | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.EMBEDDINGS_API_KEY}`,
        },
      });
      if (response.ok) return;
      lastStatus = response.status;
      lastBody = await response.text().catch(() => null);
      lastError = null;
    } catch (err) {
      lastStatus = null;
      lastBody = null;
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  const errorDetail = lastError
    ? `network error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    : `HTTP ${lastStatus}: ${lastBody?.slice(0, 300) ?? "(no body)"}`;

  console.warn(
    `[embeddings] Failed to trigger embedding generation after retries — url=${url} ${errorDetail}`,
  );
  Sentry.captureMessage(
    "Failed to trigger server-side embedding generation after retries",
    {
      level: "warning",
      tags: { source: "fire-and-forget", operation: "embedding" },
      extra: {
        url,
        lastStatus,
        lastBody: lastBody?.slice(0, 500),
        lastError: lastError instanceof Error ? lastError.message : lastError,
      },
    },
  );
}
