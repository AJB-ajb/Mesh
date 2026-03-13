/**
 * Centralized route constants.
 *
 * Every redirect, <Link>, router.push(), and middleware reference should use
 * these constants instead of string literals. Renaming a route then produces
 * TypeScript errors everywhere instead of silent 404s.
 */

// ---------------------------------------------------------------------------
// Dashboard (authenticated)
// ---------------------------------------------------------------------------

export const ROUTES = {
  /** Main landing page for authenticated users */
  home: "/spaces",
  spaces: "/spaces",
  space: (id: string) => `/spaces/${id}` as const,
  activity: "/activity",
  profile: "/profile",
  publicProfile: (userId: string) => `/profile/${userId}` as const,
  settings: "/settings",

  // Auth
  login: "/login",
  signup: "/signup",
  onboarding: "/onboarding",
  onboardingDeveloper: "/onboarding/developer",

  // Static / public
  why: "/why",
  privacy: "/privacy",
  terms: "/terms",
} as const;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/** Routes that require authentication — unauthenticated visitors redirect to login. */
export const PROTECTED_ROUTES = [
  ROUTES.spaces,
  ROUTES.activity,
  ROUTES.settings,
  ROUTES.profile,
] as const;

/** Auth routes — authenticated users redirect to home. */
export const AUTH_ROUTES = [ROUTES.login, ROUTES.signup] as const;
