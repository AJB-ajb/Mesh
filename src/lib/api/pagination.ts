/**
 * Parse pagination query params from a URLSearchParams object.
 *
 * Clamps `limit` to `[1, max]` and `offset` to `[0, ∞)`.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { limit?: number; max?: number } = {},
): { limit: number; offset: number } {
  const { limit: defaultLimit = 20, max = 50 } = defaults;
  const limit = Math.min(
    Math.max(1, Number(searchParams.get("limit") || defaultLimit)),
    max,
  );
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));
  return { limit, offset };
}
