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
  posting: (id: string) => `posting-detail/${id}` as const,
  postings: (params?: string) =>
    params ? (`/api/postings?${params}` as const) : ("/api/postings" as const),
  notifications: () => "header-notifications" as const,
  inbox: () => "/api/inbox" as const,
  inboxData: () => "inbox" as const,
  conversationMessages: (conversationId: string, userId: string) =>
    `messages/${conversationId}/${userId}` as const,
  activePostings: () => "active-postings" as const,
  bookmarks: () => "/api/bookmarks" as const,
  matches: () => "/api/matches/for-me" as const,
  connections: () => "/api/friendships" as const,
  interests: () => "/api/matches/interests" as const,
  settings: () => "settings" as const,
  notificationPreferences: () => "notification-preferences" as const,
  calendarConnections: () => "/api/calendar/connections" as const,
  calendarBusyBlocks: (profileId: string) =>
    `busy-blocks:${profileId}` as const,
  availability: (type: string, id: string) =>
    `/api/availability/${type}/${id}` as const,
  meetingProposals: (postingId: string) =>
    `api/postings/${postingId}/proposals` as const,
  commonAvailability: (postingId: string) =>
    `api/postings/${postingId}/common-availability` as const,
  profileSearch: (query: string) => `profile-search/${query}` as const,
  githubSync: () => "/api/github/sync" as const,
};
