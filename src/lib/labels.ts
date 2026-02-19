/**
 * Centralized user-facing labels for MeshIt.
 *
 * Single source of truth for all UI strings related to join requests, matches,
 * and notifications. Follows the terminology spec (spec/terminology.md).
 *
 * When adding i18n (e.g. next-intl), migrate these values into message files
 * and replace this module with translation lookups.
 */

export const labels = {
  joinRequest: {
    /** Shown to the applicant (requester perspective) */
    applicantStatus: {
      pending: "Request pending",
      accepted: "Accepted",
      rejected: "Not selected",
      withdrawn: "Withdrawn",
      waitlisted: "Waitlisted",
    } as const,

    /** Shown to the posting owner */
    ownerBadge: {
      pending: "New",
      accepted: "Accepted",
      rejected: "Declined",
      withdrawn: "Withdrawn",
    } as const,

    /** Action buttons */
    action: {
      accept: "Accept",
      decline: "Decline",
      withdraw: "Withdraw request",
      requestToJoin: "Request to join",
      join: "Join",
      joinWaitlist: "Join waitlist",
      requestWaitlist: "Request to join waitlist",
      requested: "Requested",
    } as const,

    /** Card / section titles */
    title: "Join Requests",
    emptyState: "No join requests yet",
    emptyHint: "Share your posting to attract collaborators!",
    pendingReview: (n: number) => `${n} pending review`,
    received: (n: number) => `${n} join request${n !== 1 ? "s" : ""} received`,
  },

  notification: {
    typeLabels: {
      interest_received: "Interest Received",
      application_accepted: "Join Request Accepted",
      application_rejected: "Join Request Declined",
      friend_request: "Connection Request",
      sequential_invite: "Sequential Invite",
      new_message: "New Message",
      match_found: "Match Found",
    } as const,
  },
} as const;
