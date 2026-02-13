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
    const error = new Error(
      errorData.error || `Request failed with status ${response.status}`,
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}
