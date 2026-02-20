/**
 * Shared validation and row-building for posting create/edit API routes.
 */

import { AppError } from "@/lib/errors";

export interface PostingBody {
  title?: string;
  description?: string;
  estimatedTime?: string;
  teamSizeMin?: string | number;
  teamSizeMax?: string | number;
  lookingFor?: string | number;
  category?: string;
  visibility?: string;
  status?: string;
  expiresAt?: string;
  locationMode?: string;
  locationName?: string;
  locationLat?: string | number;
  locationLng?: string | number;
  maxDistanceKm?: string | number;
  tags?: string;
  contextIdentifier?: string;
  autoAccept?: string | boolean;
  availabilityMode?: string;
  timezone?: string;
  selectedSkills?: { skillId: string; levelMin: number }[];
  availabilityWindows?: {
    day_of_week: number;
    start_minutes: number;
    end_minutes: number;
  }[];
}

/**
 * Validate required fields and return sanitised values.
 * Throws AppError on validation failure.
 */
export function validatePostingBody(
  body: PostingBody,
  mode: "create" | "edit",
): void {
  if (mode === "create" && !body.description?.trim()) {
    throw new AppError("VALIDATION", "Description is required", 400);
  }
}

/**
 * Build a DB row object from validated body fields.
 * Does NOT include creator_id or status — caller adds those.
 */
export function buildPostingDbRow(body: PostingBody, mode: "create" | "edit") {
  const lookingFor = Math.max(
    1,
    Math.min(10, Number(body.lookingFor ?? body.teamSizeMax) || 3),
  );

  const locationLat = parseFloat(String(body.locationLat ?? ""));
  const locationLng = parseFloat(String(body.locationLng ?? ""));
  const maxDistanceKm = parseInt(String(body.maxDistanceKm ?? ""), 10);

  const autoAccept =
    typeof body.autoAccept === "boolean"
      ? body.autoAccept
      : body.autoAccept === "true";

  const tags = body.tags
    ? body.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];

  const row: Record<string, unknown> = {
    title: (body.title ?? "").trim() || undefined,
    description: (body.description ?? "").trim() || undefined,
    estimated_time: body.estimatedTime || null,
    team_size_min: Math.max(
      1,
      Math.min(lookingFor, Number(body.teamSizeMin) || 1),
    ),
    team_size_max: lookingFor,
    category: body.category || "personal",
    visibility: body.visibility || "public",
    mode: body.visibility === "private" ? "friend_ask" : "open",
    location_mode: body.locationMode || "either",
    location_name: (body.locationName ?? "").trim() || null,
    location_lat: Number.isFinite(locationLat) ? locationLat : null,
    location_lng: Number.isFinite(locationLng) ? locationLng : null,
    max_distance_km:
      Number.isFinite(maxDistanceKm) && maxDistanceKm > 0
        ? maxDistanceKm
        : null,
    tags,
    context_identifier: (body.contextIdentifier ?? "").trim() || null,
    auto_accept: autoAccept,
    availability_mode: body.availabilityMode || "flexible",
    timezone: body.timezone || null,
  };

  if (mode === "edit") {
    row.status = body.status || undefined;
    if (body.expiresAt) {
      row.expires_at = new Date(body.expiresAt + "T23:59:59").toISOString();
    }
    row.updated_at = new Date().toISOString();
  }

  if (mode === "create") {
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt + "T23:59:59")
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    row.expires_at = expiresAt.toISOString();
  }

  return row;
}
