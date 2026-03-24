/**
 * Centralized SWR cache key factory.
 *
 * Every SWR key in the app should come from here so that invalidation,
 * deduplication, and cross-hook revalidation work reliably.
 *
 * Keys match the values already used across hooks so migration is non-breaking.
 */

export const cacheKeys = {
  profile: () => "profile" as const,
  notifications: () => "header-notifications" as const,
  bookmarks: () => "/api/bookmarks" as const,
  connections: () => "/api/friendships" as const,
  settings: () => "settings" as const,
  notificationPreferences: () => "notification-preferences" as const,
  calendarConnections: () => "/api/calendar/connections" as const,
  calendarBusyBlocks: (profileId: string) =>
    `busy-blocks:${profileId}` as const,
  availability: (type: string, id: string) =>
    `/api/availability/${type}/${id}` as const,
  profileSearch: (query: string) => `profile-search/${query}` as const,
  githubSync: () => "/api/github/sync" as const,

  // Spaces
  spaces: () => "/api/spaces" as const,
  space: (id: string) => `/api/spaces/${id}` as const,
  spaceMessages: (spaceId: string) =>
    `/api/spaces/${spaceId}/messages` as const,
  spaceMembers: (spaceId: string) => `/api/spaces/${spaceId}/members` as const,
  spacePostings: (spaceId: string) =>
    `/api/spaces/${spaceId}/postings` as const,
  spaceJoinRequests: (postingId: string) =>
    `space-join-requests/${postingId}` as const,
  acceptedPostingIds: (spaceId: string) =>
    `accepted-posting-ids/${spaceId}` as const,
  spaceSearch: (spaceId: string, query: string) =>
    `/api/spaces/${spaceId}/search?q=${encodeURIComponent(query)}` as const,

  // Space cards
  spaceCards: (spaceId: string) => `/api/spaces/${spaceId}/cards` as const,
  spaceCalendar: (spaceId: string) =>
    `/api/spaces/${spaceId}/calendar` as const,

  // Activity
  activityCards: () => "/api/activity" as const,
  activityPendingCount: () => "activity-pending-count" as const,
};
