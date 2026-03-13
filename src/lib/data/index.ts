/**
 * Barrel re-export for the data access layer.
 */

export {
  getProfile,
  getProfileTimezone,
  getNotificationPreferences,
  batchGetProfiles,
  updateProfileFields,
} from "./profiles";

export {
  getNotificationsForUser,
  markNotificationsRead,
  createNotification,
} from "./notifications";

// Spaces
export * as spaces from "./spaces";
export * as spaceMembers from "./space-members";
export * as spaceMessages from "./space-messages";
export * as spacePostings from "./space-postings";
export * as spaceJoinRequests from "./space-join-requests";
export * as spaceInvites from "./space-invites";
export * as activityCards from "./activity-cards";
