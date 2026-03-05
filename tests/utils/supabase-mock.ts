import { vi } from "vitest";

type SupabaseResult = { data: unknown; error: unknown; count?: number | null };

/**
 * Build a chainable Supabase query mock.
 *
 * Terminal methods (`single`, `maybeSingle`) resolve to `resolveValue`.
 * The chain itself is also thenable so `await supabase.from("t").select()`
 * resolves to the same value.
 */
export function buildChain(resolveValue: SupabaseResult) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "or",
    "in",
    "is",
    "limit",
    "order",
    "range",
    "head",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Terminal methods resolve to the value
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolveValue);
  // Make the chain itself awaitable (for queries without single/maybeSingle)
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveValue);
  return chain;
}

/**
 * Build a count-only chain for `supabase.from("t").select("*", { count: "exact", head: true }).eq(...)`.
 */
export function buildCountChain(count: number) {
  const result: SupabaseResult = { data: null, error: null, count };
  return buildChain(result);
}

/**
 * Standard mock user for authenticated route tests.
 */
export const MOCK_USER = { id: "user-1", email: "a@b.com" };

/**
 * Configure `mockGetUser` to return an authenticated user.
 */
export function authedUser(
  mockGetUser: ReturnType<typeof vi.fn>,
  user = MOCK_USER,
) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

/**
 * Configure `mockGetUser` to return an unauthenticated state.
 */
export function unauthenticatedUser(mockGetUser: ReturnType<typeof vi.fn>) {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "No session" },
  });
}
