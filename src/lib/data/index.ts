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
