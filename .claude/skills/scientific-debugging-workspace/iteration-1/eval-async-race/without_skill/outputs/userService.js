// User service - fetches and enriches user profiles

import { AsyncLocalStorage } from "node:async_hooks";

const requestStorage = new AsyncLocalStorage();

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

  // Store in request-scoped context so getCurrentUser() is safe
  const store = requestStorage.getStore();
  if (store) {
    store.currentUser = user;
  }

  return user;
}

/**
 * Quick access to the current request's user (used by logging middleware).
 * Returns the user for the current async context, not a global singleton.
 */
export function getCurrentUser() {
  const store = requestStorage.getStore();
  return store ? store.currentUser : null;
}

/**
 * Wraps a request handler so that getEnrichedUser/getCurrentUser are
 * scoped to that request's async context.
 *
 * Usage in middleware:
 *   import { withRequestScope } from './userService.js';
 *   app.use((req, res, next) => withRequestScope(() => next()));
 */
export function withRequestScope(fn) {
  return requestStorage.run({ currentUser: null }, fn);
}
