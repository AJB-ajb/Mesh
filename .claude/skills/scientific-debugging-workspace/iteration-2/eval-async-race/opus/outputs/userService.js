// User service - fetches and enriches user profiles

let currentUser = null;

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
 */
export async function getEnrichedUser(userId) {
  const user = await fetchUserProfile(userId);
  const permissions = await fetchUserPermissions(userId);
  user.permissions = permissions;

  // Update module-level reference (deprecated — prefer using the returned
  // user object or storing it on the request context instead).
  currentUser = user;

  return user;
}

/**
 * Quick access to the last loaded user (used by logging middleware).
 *
 * @deprecated This is unreliable under concurrent load because the module-level
 * `currentUser` can be overwritten by any request at any time. Callers should
 * use the user object returned by getEnrichedUser() or stored on the request
 * context (e.g., req.user) instead.
 */
export function getCurrentUser() {
  return currentUser;
}
