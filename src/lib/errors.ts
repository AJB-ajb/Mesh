/**
 * Standardized error types and API response helpers.
 */

import { NextResponse } from "next/server";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Return a consistent JSON error response from API routes.
 */
export function apiError(
  code: ErrorCode,
  message: string,
  statusCode: number = 500,
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status: statusCode },
  );
}

/**
 * Return a consistent JSON success response from API routes.
 */
export function apiSuccess<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json(data, { status: statusCode });
}

/**
 * Parse JSON body from a request, throwing an AppError on invalid JSON.
 * Use inside `withAuth` handlers — the error is caught and returned as 400.
 */
export async function parseBody<T = Record<string, unknown>>(
  req: Request,
): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new AppError("VALIDATION", "Invalid JSON body", 400);
  }
}
