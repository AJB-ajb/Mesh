/**
 * Shared validation and row-building for space posting create/edit API routes.
 */

import { AppError } from "@/lib/errors";
import type { SpacePostingInsert, SpacePostingUpdate } from "@/lib/supabase/types";

export interface SpacePostingBody {
  text?: string;
  category?: string;
  tags?: string | string[];
  capacity?: string | number;
  teamSizeMin?: string | number;
  deadline?: string;
  activityDate?: string;
  visibility?: string;
  autoAccept?: string | boolean;
  status?: string;
}

/**
 * Validate required fields for space posting create/edit.
 * Throws AppError on validation failure.
 */
export function validateSpacePostingBody(
  body: SpacePostingBody,
  mode: "create" | "edit",
): void {
  if (mode === "create" && !body.text?.trim()) {
    throw new AppError("VALIDATION", "Text is required", 400);
  }

  if (body.capacity !== undefined) {
    const cap = Number(body.capacity);
    if (!Number.isFinite(cap) || cap < 1) {
      throw new AppError("VALIDATION", "Capacity must be at least 1", 400);
    }
  }

  if (body.visibility !== undefined) {
    if (!["public", "private"].includes(body.visibility)) {
      throw new AppError(
        "VALIDATION",
        "Visibility must be 'public' or 'private'",
        400,
      );
    }
  }
}

/**
 * Build a DB row object from validated body fields for INSERT.
 * Does NOT include space_id or created_by — caller adds those.
 */
export function buildSpacePostingInsertRow(
  body: SpacePostingBody,
): Omit<SpacePostingInsert, "space_id" | "created_by"> {
  const capacity = Math.max(1, Math.min(100, Number(body.capacity) || 1));
  const teamSizeMin = Math.max(
    1,
    Math.min(capacity, Number(body.teamSizeMin) || 1),
  );

  const autoAccept =
    typeof body.autoAccept === "boolean"
      ? body.autoAccept
      : body.autoAccept === "true";

  const tags = Array.isArray(body.tags)
    ? body.tags
    : body.tags
      ? body.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];

  const row: Omit<SpacePostingInsert, "space_id" | "created_by"> = {
    text: (body.text ?? "").trim(),
    category: (body.category ?? "").trim() || null,
    tags,
    capacity,
    team_size_min: teamSizeMin,
    visibility: (body.visibility as "public" | "private") ?? "public",
    auto_accept: autoAccept,
  };

  if (body.deadline) {
    row.deadline = new Date(body.deadline).toISOString();
  }

  if (body.activityDate) {
    row.activity_date = new Date(body.activityDate).toISOString();
  }

  return row;
}

/**
 * Build a DB row object from validated body fields for UPDATE.
 */
export function buildSpacePostingUpdateRow(
  body: SpacePostingBody,
): SpacePostingUpdate {
  const row: SpacePostingUpdate = {};

  if (body.text !== undefined) {
    row.text = (body.text ?? "").trim();
  }
  if (body.category !== undefined) {
    row.category = (body.category ?? "").trim() || null;
  }
  if (body.tags !== undefined) {
    row.tags = Array.isArray(body.tags)
      ? body.tags
      : body.tags
        ? body.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];
  }
  if (body.capacity !== undefined) {
    row.capacity = Math.max(1, Math.min(100, Number(body.capacity) || 1));
  }
  if (body.teamSizeMin !== undefined) {
    row.team_size_min = Math.max(1, Number(body.teamSizeMin) || 1);
  }
  if (body.deadline !== undefined) {
    row.deadline = body.deadline
      ? new Date(body.deadline).toISOString()
      : null;
  }
  if (body.activityDate !== undefined) {
    row.activity_date = body.activityDate
      ? new Date(body.activityDate).toISOString()
      : null;
  }
  if (body.visibility !== undefined) {
    row.visibility = body.visibility as "public" | "private";
  }
  if (body.autoAccept !== undefined) {
    row.auto_accept =
      typeof body.autoAccept === "boolean"
        ? body.autoAccept
        : body.autoAccept === "true";
  }
  if (body.status !== undefined) {
    row.status = body.status as SpacePostingUpdate["status"];
  }

  return row;
}
