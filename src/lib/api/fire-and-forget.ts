import * as Sentry from "@sentry/nextjs";

/**
 * Wraps a fire-and-forget promise with error logging.
 * Use instead of `.catch(() => {})` to ensure errors are captured.
 */
export function logFireAndForget(promise: Promise<unknown>, context: string): void {
  promise.catch((error) => {
    console.warn(`[fire-and-forget] ${context} failed:`, error instanceof Error ? error.message : error);
    Sentry.captureException(error, {
      tags: { source: "fire-and-forget", operation: context },
    });
  });
}
