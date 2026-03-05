/**
 * Client-side mutation utility for API routes.
 *
 * Replaces the repeated fetch + JSON headers + error-parse + toast pattern
 * found across 10+ hooks. Plain async function (not a hook).
 */

import { toast } from "sonner";
import { labels } from "@/lib/labels";

type ToastKey = keyof typeof labels.toasts;

interface ApiMutateOptions {
  method?: string;
  body?: unknown;
  /** Key into `labels.toasts` shown on success. */
  successToast?: ToastKey;
  /** Key into `labels.toasts` shown on error. */
  errorToast?: ToastKey;
  /** Fallback error message when the server doesn't provide one. */
  errorFallback?: string;
}

interface ApiMutateResult<T> {
  data: T;
  status: number;
}

/**
 * Perform a fetch to `url` with JSON body, parse the response, and
 * optionally show success/error toasts using centralized labels.
 *
 * Throws on non-OK responses with the server error message.
 */
export async function apiMutate<T = unknown>(
  url: string,
  options: ApiMutateOptions = {},
): Promise<ApiMutateResult<T>> {
  const {
    method = "POST",
    body,
    successToast,
    errorToast,
    errorFallback = "Something went wrong. Please try again.",
  } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    let message = errorFallback;
    try {
      const errorData = await response.json();
      message =
        typeof errorData.error === "string"
          ? errorData.error
          : errorData.error?.message || errorFallback;
    } catch {
      // response wasn't JSON — use fallback
    }

    if (errorToast) {
      toast.error(labels.toasts[errorToast]);
    }

    throw new Error(message);
  }

  const data: T = await response.json();

  if (successToast) {
    toast.success(labels.toasts[successToast]);
  }

  return { data, status: response.status };
}
