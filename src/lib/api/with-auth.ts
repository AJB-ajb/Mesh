/**
 * Auth middleware for API routes.
 * Wraps route handlers with authentication check.
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/errors";

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
  params: Record<string, string>;
}

type AuthHandler = (req: Request, ctx: AuthContext) => Promise<NextResponse>;

/**
 * Higher-order function that wraps a route handler with auth check.
 * Replaces the repeated pattern of:
 *   const supabase = await createClient();
 *   const { data: { user }, error } = await supabase.auth.getUser();
 *   if (error || !user) return 401;
 */
export function withAuth(handler: AuthHandler) {
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
      console.error("Route handler error:", error);
      Sentry.captureException(error, {
        extra: { url: req.url, method: req.method },
      });
      return apiError(
        "INTERNAL",
        error instanceof Error ? error.message : "Internal server error",
        500,
      );
    }
  };

  // Cast to satisfy Next.js's strict route handler type requirements
  // while still allowing calls without the second parameter
  return fn as (
    req: Request,
    context: { params: Promise<Record<string, string>> },
  ) => Promise<NextResponse>;
}
