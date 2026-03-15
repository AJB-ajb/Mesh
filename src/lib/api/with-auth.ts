/**
 * Auth middleware for API routes.
 * Wraps route handlers with authentication check.
 *
 * Supports three auth modes:
 * - **user** (default): requires authenticated user session (cookie or Bearer JWT)
 * - **cron**: validates Bearer token against an env-var secret
 * - **optional**: provides user if logged in, null otherwise
 *
 * Bearer JWT fallback: when no cookie session exists, user and optional modes
 * check for `Authorization: Bearer <jwt>` and validate via Supabase auth.
 * This enables headless API clients (bots, mobile, scripts) without cookies.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@supabase/supabase-js";
import { apiError, AppError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
  params: Record<string, string>;
}

export interface CronContext {
  supabase: SupabaseClient;
  params: Record<string, string>;
}

export interface OptionalAuthContext {
  user: User | null;
  supabase: SupabaseClient;
  params: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Handler types
// ---------------------------------------------------------------------------

type AuthHandler = (req: Request, ctx: AuthContext) => Promise<NextResponse>;
type CronHandler = (req: Request, ctx: CronContext) => Promise<NextResponse>;
type OptionalAuthHandler = (
  req: Request,
  ctx: OptionalAuthContext,
) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// Options types
// ---------------------------------------------------------------------------

interface CronOptions {
  authMode: "cron";
  /** Name of the env var holding the expected Bearer secret. */
  cronSecretEnv: string;
}

interface OptionalOptions {
  authMode: "optional";
}

// ---------------------------------------------------------------------------
// Next.js route handler return type
// ---------------------------------------------------------------------------

type RouteHandler = (
  req: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

// ---------------------------------------------------------------------------
// Error handling shared by all modes
// ---------------------------------------------------------------------------

function handleError(error: unknown, req: Request): NextResponse {
  if (error instanceof AppError) {
    return apiError(error.code, error.message, error.statusCode);
  }
  console.error("Route handler error:", error);
  Sentry.captureException(error, {
    extra: { url: req.url, method: req.method },
  });
  return apiError("INTERNAL", "Internal server error", 500);
}

// ---------------------------------------------------------------------------
// Overloads
// ---------------------------------------------------------------------------

/** Cron mode — validates Bearer secret, no user session. */
export function withAuth(
  options: CronOptions,
  handler: CronHandler,
): RouteHandler;

/** Optional auth — provides user if logged in, null otherwise. */
export function withAuth(
  options: OptionalOptions,
  handler: OptionalAuthHandler,
): RouteHandler;

/** Default (user) mode — requires authenticated user. */
export function withAuth(handler: AuthHandler): RouteHandler;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function withAuth(
  handlerOrOptions: AuthHandler | CronOptions | OptionalOptions,
  maybeHandler?: CronHandler | OptionalAuthHandler,
): RouteHandler {
  // Detect which overload was called
  if (typeof handlerOrOptions === "function") {
    // Default (user) mode
    return buildUserMode(handlerOrOptions);
  }

  const options = handlerOrOptions;
  const handler = maybeHandler!;

  if (options.authMode === "cron") {
    return buildCronMode(options, handler as CronHandler);
  }

  // optional
  return buildOptionalMode(handler as OptionalAuthHandler);
}

// ---------------------------------------------------------------------------
// Bearer JWT fallback
// ---------------------------------------------------------------------------

/**
 * Try to authenticate via `Authorization: Bearer <jwt>` header.
 * Returns { user, supabase } if successful, null otherwise.
 */
function tryBearerAuth(
  req: Request,
): { user: User; supabase: SupabaseClient } | null {
  const authHeader = req.headers.get("authorization");
  const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!jwt) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  // Create a Supabase client scoped to this JWT — respects RLS as the user
  const supabase = createBrowserClient(url, key, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { user: null as unknown as User, supabase };
}

/**
 * Validate Bearer JWT by calling supabase.auth.getUser().
 * Separated from tryBearerAuth because getUser() is async.
 */
async function validateBearerAuth(
  candidate: { user: User; supabase: SupabaseClient } | null,
): Promise<{ user: User; supabase: SupabaseClient } | null> {
  if (!candidate) return null;
  const {
    data: { user },
    error,
  } = await candidate.supabase.auth.getUser();
  if (error || !user) return null;
  return { user, supabase: candidate.supabase };
}

// ---------------------------------------------------------------------------
// Mode builders
// ---------------------------------------------------------------------------

function buildUserMode(handler: AuthHandler): RouteHandler {
  const fn = async (
    req: Request,
    routeContext?: { params?: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!authError && user) {
        const params = routeContext?.params ? await routeContext.params : {};
        return await handler(req, { user, supabase, params });
      }

      // Fallback: try Bearer JWT from Authorization header
      const bearer = await validateBearerAuth(tryBearerAuth(req));
      if (bearer) {
        const params = routeContext?.params ? await routeContext.params : {};
        return await handler(req, {
          user: bearer.user,
          supabase: bearer.supabase,
          params,
        });
      }

      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    } catch (error) {
      return handleError(error, req);
    }
  };

  return fn as RouteHandler;
}

function buildCronMode(
  options: CronOptions,
  handler: CronHandler,
): RouteHandler {
  const fn = async (
    req: Request,
    routeContext?: { params?: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      const expectedSecret = process.env[options.cronSecretEnv];
      if (!expectedSecret) {
        console.error(
          `withAuth cron: env var ${options.cronSecretEnv} is not set`,
        );
        return apiError("INTERNAL", "Server misconfiguration", 500);
      }

      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      if (!token || token !== expectedSecret) {
        return apiError("UNAUTHORIZED", "Invalid cron secret", 401);
      }

      const supabase = await createClient();
      const params = routeContext?.params ? await routeContext.params : {};

      return await handler(req, { supabase, params });
    } catch (error) {
      return handleError(error, req);
    }
  };

  return fn as RouteHandler;
}

function buildOptionalMode(handler: OptionalAuthHandler): RouteHandler {
  const fn = async (
    req: Request,
    routeContext?: { params?: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const params = routeContext?.params ? await routeContext.params : {};

      if (user) {
        return await handler(req, { user, supabase, params });
      }

      // Fallback: try Bearer JWT
      const bearer = await validateBearerAuth(tryBearerAuth(req));
      if (bearer) {
        return await handler(req, {
          user: bearer.user,
          supabase: bearer.supabase,
          params,
        });
      }

      return await handler(req, { user: null, supabase, params });
    } catch (error) {
      return handleError(error, req);
    }
  };

  return fn as RouteHandler;
}
