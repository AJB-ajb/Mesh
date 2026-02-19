/**
 * Notification preference types and utility functions.
 */

import { labels } from "@/lib/labels";

export type NotificationType =
  | "interest_received"
  | "application_accepted"
  | "application_rejected"
  | "friend_request"
  | "sequential_invite"
  | "new_message"
  | "match_found";

export type NotificationChannel = "in_app" | "browser";

export type ChannelPreferences = Record<NotificationType, boolean>;

export interface NotificationPreferences {
  in_app: ChannelPreferences;
  browser: ChannelPreferences;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  in_app: {
    interest_received: true,
    application_accepted: true,
    application_rejected: true,
    friend_request: true,
    sequential_invite: true,
    new_message: true,
    match_found: true,
  },
  browser: {
    interest_received: true,
    application_accepted: true,
    application_rejected: false,
    friend_request: true,
    sequential_invite: true,
    new_message: true,
    match_found: false,
  },
};

/**
 * Check whether a notification should be delivered on a given channel.
 * Falls back to `true` when the preference is missing to avoid silently
 * dropping notifications for old profiles that lack the column.
 */
export function shouldNotify(
  prefs: NotificationPreferences | null | undefined,
  type: NotificationType,
  channel: NotificationChannel,
): boolean {
  if (!prefs) return true;
  const channelPrefs = prefs[channel];
  if (!channelPrefs) return true;
  return channelPrefs[type] ?? true;
}

/** Human-readable labels for notification types. */
export const notificationTypeLabels: Record<NotificationType, string> =
  labels.notification.typeLabels;

/** All notification types in display order. */
export const allNotificationTypes: NotificationType[] = [
  "interest_received",
  "application_accepted",
  "application_rejected",
  "friend_request",
  "sequential_invite",
  "new_message",
  "match_found",
];
