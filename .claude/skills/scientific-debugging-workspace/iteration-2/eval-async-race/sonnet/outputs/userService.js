// User service - fetches and enriches user profiles

// REMOVED: module-level `currentUser` singleton.
//
// Root cause of the intermittent bug: `currentUser` was shared mutable state
// at module scope. Under concurrent load, two calls to `getEnrichedUser` would
// interleave across the `await` suspension points, causing one request to
// overwrite `currentUser` while the other was still using it. The result was
// that a caller received a real, valid user object — just the wrong one.
//
// Fix: eliminate the shared variable. Each call now keeps its result in a
// local variable that is private to that invocation. There is no longer any
// state shared between concurrent calls.

async function fetchUserProfile(userId) {
  const response = await fetch(`/api/users/${userId}`);
  const user = await response.json();
  return user;
}

async function fetchUserPermissions(userId) {
  const response = await fetch(`/api/users/${userId}/permissions`);
  const permissions = await response.json();
  return permissions;
}

/**
 * Get a fully enriched user profile with permissions.
 * Called from the auth middleware on every request.
 *
 * Each invocation is now fully self-contained: `user` is a local variable
 * and is never shared with or visible to any other concurrent call.
 */
export async function getEnrichedUser(userId) {
  // Local variable — scoped to this invocation only.
  const user = await fetchUserProfile(userId);
  const permissions = await fetchUserPermissions(userId);
  user.permissions = permissions;
  return user;
}

/**
 * getCurrentUser() has been removed.
 *
 * A module-level "last loaded user" accessor is unsafe under concurrency:
 * any number of requests may be in-flight simultaneously, and there is no
 * single "current" user that is meaningful across them.
 *
 * Callers that previously relied on getCurrentUser() for logging should
 * instead receive the user as a parameter or read it from the request
 * context (e.g. req.user in Express middleware). For example:
 *
 *   // In auth middleware:
 *   req.user = await getEnrichedUser(userId);
 *
 *   // In logging middleware:
 *   logger.info('request from', req.user.id);
 *
 * This pattern keeps each request's user data isolated within its own
 * request/response cycle rather than in shared module state.
 */
