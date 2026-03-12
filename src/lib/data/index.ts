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
  getPosting,
  getPostingWithCreator,
  createPosting,
  updatePosting,
} from "./postings";

export {
  getApplication,
  getApplicationForPosting,
  createApplication,
  updateApplicationStatus,
  countApplicationsByStatus,
} from "./applications";

export { getMatch, getMatchesForUser, updateMatchStatus } from "./matches";

export {
  getNotificationsForUser,
  markNotificationsRead,
  createNotification,
} from "./notifications";

export { getBookmarkedPostingIds, toggleBookmark } from "./bookmarks";

// Spaces
export * as spaces from "./spaces";
export * as spaceMembers from "./space-members";
export * as spaceMessages from "./space-messages";
export * as spacePostings from "./space-postings";
export * as spaceJoinRequests from "./space-join-requests";
export * as spaceInvites from "./space-invites";
export * as activityCards from "./activity-cards";
