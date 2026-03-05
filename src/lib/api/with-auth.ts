/**
 * Auth middleware for API routes.
 * Wraps route handlers with authentication check.
 *
 * Supports three auth modes:
 * - **user** (default): requires authenticated user session
 * - **cron**: validates Bearer token against an env-var secret
 * - **optional**: provides user if logged in, null otherwise
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
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

      if (authError || !user) {
        return apiError("UNAUTHORIZED", "Unauthorized", 401);
      }

      const params = routeContext?.params ? await routeContext.params : {};

      return await handler(req, { user, supabase, params });
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

      return await handler(req, { user: user ?? null, supabase, params });
    } catch (error) {
      return handleError(error, req);
    }
  };

  return fn as RouteHandler;
}
