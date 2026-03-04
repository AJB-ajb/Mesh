// User service - fetches and enriches user profiles
// FIXED: Removed global currentUser state to eliminate race condition

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
 * FIXED: Now returns the enriched user directly instead of storing in global state.
 * This eliminates race conditions under concurrent load.
 */
export async function getEnrichedUser(userId) {
  const user = await fetchUserProfile(userId);
  const permissions = await fetchUserPermissions(userId);
  user.permissions = permissions;
  return user;
}

/**
 * DEPRECATED: This function relied on global state and caused race conditions.
 *
 * Instead: Pass the user through request context (e.g., Express middleware via req.user,
 * or AsyncLocalStorage for better isolation). The logging middleware should receive
 * the user as a parameter rather than querying global state.
 *
 * Example (Express middleware):
 *
 *   app.use(async (req, res, next) => {
 *     const user = await getEnrichedUser(req.userId);
 *     req.user = user;  // Store in request context
 *     next();
 *   });
 *
 *   // Logging middleware:
 *   app.use((req, res, next) => {
 *     console.log(`User: ${req.user.id}`);  // Use req.user, not getCurrentUser()
 *     next();
 *   });
 */
export function getCurrentUser() {
  throw new Error(
    "getCurrentUser() relied on global state and caused race conditions. " +
      "Pass user through request context (req.user, AsyncLocalStorage, or middleware params) instead.",
  );
}
