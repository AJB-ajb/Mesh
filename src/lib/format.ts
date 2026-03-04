/**
 * Shared formatting utilities.
 * Extracted from duplicated implementations across dashboard pages.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toDate(date: string | Date): Date {
  return typeof date === "string" ? new Date(date) : date;
}

function timeDiffs(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return {
    diffMins: Math.floor(diffMs / (1000 * 60)),
    diffHours: Math.floor(diffMs / (1000 * 60 * 60)),
    diffDays: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
  };
}

// ---------------------------------------------------------------------------
// Public formatters
// ---------------------------------------------------------------------------

/**
 * Format a date string as a relative "Posted X days ago" label.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const { diffDays } = timeDiffs(date);

  if (diffDays === 0) return "Posted today";
  if (diffDays === 1) return "Posted 1 day ago";
  return `Posted ${diffDays} days ago`;
}

/**
 * Format a date as a relative time-ago label (long form).
 *
 * Output examples: "Just now", "5 minutes ago", "3 hours ago",
 * "Yesterday", "4 days ago", then falls back to locale date string.
 *
 * Used by match cards, interest cards, and similar contexts.
 */
export function formatTimeAgo(date: string | Date): string {
  const d = toDate(date);
  const { diffMins, diffHours, diffDays } = timeDiffs(d);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

/**
 * Compact time-ago label for chat bubbles, notification lists, etc.
 *
 * Output examples: "Just now", "5m ago", "3h ago",
 * "Yesterday", "4d ago", then falls back to locale date string.
 */
export function formatTimeAgoShort(date: string | Date): string {
  const d = toDate(date);
  const { diffMins, diffHours, diffDays } = timeDiffs(d);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

/**
 * Day-level relative date label for posting cards.
 *
 * Output examples: "Today", "Yesterday", "4 days ago",
 * "2 weeks ago", then falls back to locale date string.
 */
export function formatDateAgo(date: string | Date): string {
  const d = toDate(date);
  const { diffDays } = timeDiffs(d);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  return d.toLocaleDateString();
}

/**
 * Strip leading markdown heading syntax (e.g. "## Title" → "Title").
 */
export function stripTitleMarkdown(title: string | null | undefined): string {
  if (!title) return "";
  return title.replace(/^#{1,6}\s+/, "");
}

/**
 * Default placeholder for unset/empty values.
 * Style convention: lowercase "s" in "specified".
 */
export const NOT_SPECIFIED = "Not specified";

/**
 * Extract a title from a description string.
 * Takes the first sentence (up to first period, question mark, exclamation mark, or newline),
 * capped at 100 characters.
 */
export function extractTitleFromDescription(desc: string): string {
  if (!desc) return "";
  // First line or first sentence
  const firstLine = desc.split(/\n/)[0] ?? "";
  const firstSentence = firstLine.match(/^[^.!?]*/)?.[0] ?? firstLine;
  const result = firstSentence.trim();
  return result.length > 100 ? result.slice(0, 97) + "..." : result;
}

/**
 * Get up to 2 uppercase initials from a full name.
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
