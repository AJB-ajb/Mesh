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
  currentUser = await fetchUserProfile(userId);
  const permissions = await fetchUserPermissions(userId);
  currentUser.permissions = permissions;
  return currentUser;
}

/**
 * Quick access to the last loaded user (used by logging middleware).
 */
export function getCurrentUser() {
  return currentUser;
}
