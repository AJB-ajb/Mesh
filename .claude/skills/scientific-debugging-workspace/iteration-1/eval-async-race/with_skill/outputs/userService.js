// User service - fetches and enriches user profiles

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
 * Returns a new enriched user object each time — no shared state.
 * The caller (auth middleware) should attach this to the request
 * context (e.g., req.user) rather than relying on module-level state.
 */
export async function getEnrichedUser(userId) {
  const user = await fetchUserProfile(userId);
  const permissions = await fetchUserPermissions(userId);
  user.permissions = permissions;
  return user;
}

/**
 * getCurrentUser() has been removed.
 *
 * The previous implementation relied on module-level mutable state
 * (`let currentUser`), which caused a race condition under concurrent
 * requests: one request's user would overwrite another's.
 *
 * Instead, the auth middleware should store the enriched user on the
 * request object (e.g., `req.user = await getEnrichedUser(userId)`),
 * and the logging middleware should read it from there
 * (e.g., `req.user`).
 */
