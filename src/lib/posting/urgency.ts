/**
 * Posting urgency badge logic.
 * Computes urgency level and display properties based on time until expiry.
 */

import { URGENCY } from "@/lib/constants";

export type UrgencyLevel = "critical" | "high" | "medium" | "none";

export type UrgencyBadge = {
  level: UrgencyLevel;
  label: string;
  variant: "destructive" | "warning" | "outline" | null;
};

/**
 * Compute urgency badge based on time remaining until expiry.
 * - critical (<24h): red badge
 * - high (<3 days): orange badge
 * - medium (<7 days): yellow badge
 * - none (>7 days or no expiry): no badge
 */
export function getUrgencyBadge(
  expiresAt: string | null | undefined,
): UrgencyBadge {
  if (!expiresAt) {
    return { level: "none", label: "", variant: null };
  }

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  // Already expired — no urgency badge (expired state handled elsewhere)
  if (diffMs <= 0) {
    return { level: "none", label: "", variant: null };
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < URGENCY.CRITICAL_HOURS) {
    const hours = Math.ceil(diffHours);
    return {
      level: "critical",
      label: hours <= 1 ? "<1h left" : `${hours}h left`,
      variant: "destructive",
    };
  }

  if (diffDays < URGENCY.HIGH_DAYS) {
    const days = Math.ceil(diffDays);
    return {
      level: "high",
      label: `${days}d left`,
      variant: "warning",
    };
  }

  if (diffDays < URGENCY.MEDIUM_DAYS) {
    const days = Math.ceil(diffDays);
    return {
      level: "medium",
      label: `${days}d left`,
      variant: "outline",
    };
  }

  return { level: "none", label: "", variant: null };
}
