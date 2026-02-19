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

  landing: {
    heroBadge: "Activity matching platform",
    heroSubheadline:
      "Hackathons, study groups, sports, concerts, side projects, startups — describe what you want to do, and we\u2019ll match you with the right people.",
    howItWorksStep2Title: "Get matched with the right people",
    howItWorksStep2Body:
      "Matching on skills, availability, location, and interests — you\u2019ll see who fits best.",
    smartMatchingTitle: "Smart Matching",
    smartMatchingBody:
      "Understands what you need and who fits — not just keyword matching.",
    ctaBody: "Post what you want to do and get matched with the right people.",
  },

  meta: {
    description:
      "Find people for hackathons, study groups, side projects, and more. Describe what you want to do and get matched with the right collaborators.",
  },

  postingCreation: {
    subtitle: "Describe your posting to find the right collaborators",
    infoAiMode:
      "Paste your posting description and we\u2019ll extract the details automatically.",
    infoFormMode:
      "After creating your posting, matching collaborators will be surfaced automatically based on your description.",
  },

  extraction: {
    postingDescription:
      "Paste your posting description from Slack, Discord, a GitHub README, or use the mic to describe it. Details will be extracted automatically.",
    formHint:
      "Skills, team size, and timeline will be extracted from your description.",
    profileDescription:
      "Paste your GitHub profile README, LinkedIn bio, resume, or use the mic to describe yourself. Your profile information will be extracted automatically.",
  },

  github: {
    connectInfo:
      "Connect your GitHub account from the Integrations section below to automatically analyze your repositories, commit messages, and coding style to enrich your profile with insights from your code.",
    suggestionsTitle: "Suggestions from your GitHub",
  },
} as const;
