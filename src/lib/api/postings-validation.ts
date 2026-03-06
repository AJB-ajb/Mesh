/**
 * Shared validation and row-building for posting create/edit API routes.
 */

import { AppError } from "@/lib/errors";
import type { ChipMetadataMap } from "@/lib/types/posting";

export interface PostingBody {
  title?: string;
  description?: string;
  estimatedTime?: string;
  teamSizeMin?: string | number;
  teamSizeMax?: string | number;
  lookingFor?: string | number;
  category?: string;
  visibility?: string;
  /** Composable access: appears in Discover feed */
  inDiscover?: boolean;
  /** Composable access: shareable link token */
  linkToken?: string | null;
  status?: string;
  expiresAt?: string;
  locationMode?: string;
  locationName?: string;
  locationLat?: string | number;
  locationLng?: string | number;
  maxDistanceKm?: string | number;
  tags?: string;
  contextIdentifier?: string;
  parentPostingId?: string;
  autoAccept?: string | boolean;
  availabilityMode?: string;
  timezone?: string;
  selectedSkills?: { skillId: string; levelMin: number }[];
  availabilityWindows?: {
    day_of_week: number;
    start_minutes: number;
    end_minutes: number;
  }[];
  sourceText?: string;
  /** @deprecated Chip metadata is replaced by mesh: link syntax in v0.6. Kept for backward compat. */
  chipMetadata?: ChipMetadataMap;
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

  // Composable access: derive in_discover from explicit field or fall back to visibility
  const inDiscover =
    body.inDiscover !== undefined
      ? body.inDiscover
      : (body.visibility ?? "public") !== "private";

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
    // Write both during expand-contract transition
    visibility: inDiscover ? "public" : "private",
    mode: inDiscover ? "open" : "friend_ask",
    in_discover: inDiscover,
    link_token: body.linkToken ?? null,
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
    parent_posting_id: (body.parentPostingId ?? "").trim() || null,
    auto_accept: autoAccept,
    availability_mode: body.availabilityMode || "flexible",
    timezone: body.timezone || null,
  };

  // chipMetadata is deprecated in v0.6 — structured data now lives in mesh: link syntax
  // within the description text itself. The field is kept in PostingBody for backward
  // compat but is no longer written to new rows.

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
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    row.expires_at = expiresAt.toISOString();

    if (body.sourceText?.trim()) {
      row.source_text = body.sourceText.trim();
    }
  }

  return row;
}
