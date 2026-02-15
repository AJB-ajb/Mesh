/**
 * SWR fetcher functions for API routes and Supabase queries
 */

/**
 * Default fetcher for API routes that return JSON.
 * Throws on non-OK responses so SWR treats them as errors.
 */
export async function apiFetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      typeof errorData.error === "string"
        ? errorData.error
        : errorData.error?.message ||
          `Request failed with status ${response.status}`;
    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}
