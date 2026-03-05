/**
 * Shared notification event constants.
 * Producers (API routes) and consumers (UI) import from here
 * so title strings can never drift out of sync.
 */

export const INVITE_RECEIVED = {
  type: "sequential_invite",
  title: "Invite Received",
} as const;
export const INVITE_ACCEPTED = {
  type: "sequential_invite",
  title: "Invite Accepted!",
} as const;
export const INVITE_DECLINED = {
  type: "sequential_invite",
  title: "Invite Declined",
} as const;
export const CONNECTION_REQUEST = {
  type: "friend_request",
  title: "Connection Request",
} as const;
export const APPLICATION_ACCEPTED = {
  type: "application_accepted",
  title: "Request Accepted!",
} as const;
export const APPLICATION_REJECTED = {
  type: "application_rejected",
  title: "Request Update",
} as const;
export const MATCHES_FOUND = {
  type: "match_found",
  title: "New Matches Found",
} as const;
export const MEETING_PROPOSED = {
  type: "meeting_proposal",
  title: "New Meeting Proposed",
} as const;
export const MEETING_CONFIRMED = {
  type: "meeting_proposal",
  title: "Meeting Confirmed",
} as const;
export const MEETING_CANCELLED = {
  type: "meeting_proposal",
  title: "Meeting Cancelled",
} as const;
