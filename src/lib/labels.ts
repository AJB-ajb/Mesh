/**
 * Centralized user-facing labels for MeshIt.
 *
 * Single source of truth for all UI strings. Follows the terminology
 * spec (spec/terminology.md).
 *
 * When adding i18n (e.g. next-intl), migrate these values into message files
 * and replace this module with translation lookups.
 */

export const labels = {
  // ---------------------------------------------------------------------------
  // Join requests
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Landing page
  // ---------------------------------------------------------------------------
  landing: {
    loginButton: "Log in",
    heroBadge: "Activity matching platform",
    heroTitle: "Find people to do things with.",
    heroSubheadline:
      "Hackathons, study groups, sports, concerts, side projects, startups \u2014 describe what you want to do, and we\u2019ll match you with the right people.",
    postSomethingButton: "Post something",
    explorePostingsButton: "Explore postings",

    useCaseSectionTitle: "People are looking for all kinds of things",
    useCaseSectionSubtitle:
      "From study partners to startup co-founders \u2014 post what you want to do and find the right people.",

    howItWorksTitle: "How it works",
    howItWorksSubtitle: "From idea to collaboration in under a minute.",
    howItWorksStep1Title: "Describe what you want to do",
    howItWorksStep1Body:
      "Paste text, speak, or fill a form \u2014 describe any activity, project, or event you need people for.",
    howItWorksStep2Title: "Get matched with the right people",
    howItWorksStep2Body:
      "Matching on skills, availability, location, and interests \u2014 you\u2019ll see who fits best.",
    howItWorksStep3Title: "Connect and collaborate",
    howItWorksStep3Body:
      "Chat, plan, and do the thing \u2014 whether it\u2019s a hackathon, a tennis match, or a startup launch.",

    featuresSectionTitle: "Built for real connections",
    featuresSectionSubtitle:
      "Smart tools that make finding the right people effortless.",
    smartMatchingTitle: "Smart Matching",
    smartMatchingBody:
      "Understands what you need and who fits \u2014 not just keyword matching.",
    voiceTextInputTitle: "Voice & Text Input",
    voiceTextInputBody:
      "Describe what you\u2019re looking for in your own words \u2014 type it out or just speak.",
    realtimeMessagingTitle: "Real-Time Messaging",
    realtimeMessagingBody:
      "Connect instantly with your matches and start planning together right away.",
    smartCompatibilityTitle: "Smart Compatibility",
    smartCompatibilityBody:
      "See why someone is a good match \u2014 skills, availability, location, and interest alignment.",

    finalCtaTitle: "Ready to find your people?",
    ctaBody: "Post what you want to do and get matched with the right people.",
    getStartedButton: "Get started free",

    footerCopyright: "\u00a9 2026 MeshIt. All rights reserved.",
    privacyLink: "Privacy",
    termsLink: "Terms",
  },

  // ---------------------------------------------------------------------------
  // Site metadata / SEO
  // ---------------------------------------------------------------------------
  meta: {
    title: "MeshIt - Find Your Perfect Match",
    description:
      "Find people for hackathons, study groups, side projects, and more. Describe what you want to do and get matched with the right collaborators.",
    appName: "MeshIt",
  },

  // ---------------------------------------------------------------------------
  // Posting creation page
  // ---------------------------------------------------------------------------
  postingCreation: {
    pageTitle: "Create Posting",
    subtitle: "Describe your posting to find the right collaborators",
    backButton: "Back to postings",
    infoAiMode:
      "Paste your posting description and we\u2019ll extract the details automatically.",
    infoFormMode:
      "After creating your posting, matching collaborators will be surfaced automatically based on your description.",

    errorEmptyText:
      "Please paste some text to extract posting information from.",
    errorEmptyDescription: "Please enter a posting description.",
    untitledFallback: "Untitled Posting",
    errorNotSignedIn: "Please sign in to create a posting.",
    errorProfileCheck: "Failed to verify your profile. Please try again.",
    errorProfileCreation: (msg: string) =>
      `Failed to create user profile: ${msg}`,
    errorMissingProfile:
      "Your profile is missing. Please complete your profile first.",
    errorDuplicate: "A posting with this information already exists.",
    errorInvalidData: (msg: string) => `Invalid posting data: ${msg}`,
    errorWithReason: (msg: string) => `Failed to create posting: ${msg}`,
    errorGeneric: "Failed to create posting. Please try again.",
  },

  // ---------------------------------------------------------------------------
  // AI extraction (shared between posting + profile)
  // ---------------------------------------------------------------------------
  extraction: {
    postingCardTitle: "AI Posting Extraction",
    postingDescription:
      "Paste your posting description from Slack, Discord, a GitHub README, or use the mic to describe it. Details will be extracted automatically.",
    postingPlaceholder: `Paste your posting text here, or use the mic to describe it...\n\nExample:\nHey everyone! Looking for 2-3 devs to join my hackathon project this weekend \u{1F680}\n\nBuilding an AI-powered recipe generator that suggests meals based on what\u2019s in your fridge.\n\nTech stack: React, TypeScript, OpenAI API, Supabase\nNeed: Frontend dev + someone with AI/ML experience\nCommitment: ~10 hrs over the weekend\n\nDM if interested!`,
    extractPostingButton: "Extract Posting Details",
    postingHelpText:
      "After extraction, you\u2019ll be able to review and edit the extracted information before creating your posting.",

    profileCardTitle: "AI Profile Extraction",
    profileDescription:
      "Paste your GitHub profile README, LinkedIn bio, resume, or use the mic to describe yourself. Your profile information will be extracted automatically.",
    profilePlaceholder: `Paste your profile text here, or use the mic to describe yourself...\n\nExample:\nHi, I\u2019m Alex! I\u2019m a full-stack developer with 5 years of experience.\n\nTech Stack: React, TypeScript, Node.js, PostgreSQL, AWS\nInterests: AI/ML, fintech, developer tools\nBased in San Francisco, available 15 hrs/week\n\nCurrently looking for hackathon projects and open source contributions.\nCheck out my work at github.com/alexdev`,
    extractProfileButton: "Extract Profile",
    profileHelpText:
      "After extraction, you\u2019ll be able to review and edit the extracted information.",

    extractingButton: "Extracting...",
    extractedButton: "Extracted!",
    switchToFormButton: "Switch to Form",
    formHint:
      "Skills, team size, and timeline will be extracted from your description.",
  },

  // ---------------------------------------------------------------------------
  // Posting form card
  // ---------------------------------------------------------------------------
  postingForm: {
    cardTitle: "Posting Details",
    cardDescription:
      "Tell us about your posting in plain language. You can paste from Slack, Discord, or describe it yourself.",
    titleLabel: "Posting Title",
    titlePlaceholder: "Optional \u2014 auto-generated from description",
    descriptionLabel: "Description",
    descriptionPlaceholder:
      "Describe your project and what kind of collaborators you\u2019re looking for...\n\nExample: Building a Minecraft-style collaborative IDE, need 2-3 people with WebGL or game dev experience, hackathon this weekend.",
    skillsLabel: "Required Skills",
    skillsHelp:
      "Search or browse the skill tree. Set an optional minimum level per skill.",
    skillsPlaceholder: "Search skills (e.g., React, Python, Design)...",
    tagsLabel: "Tags (comma-separated)",
    tagsPlaceholder: "e.g., beginner-friendly, weekend, remote, sustainability",
    tagsHelp: "Free-form tags to help people discover your posting.",
    estimatedTimeLabel: "Estimated Time",
    estimatedTimePlaceholder: "e.g., 2 weeks, 1 month",
    categoryLabel: "Category",
    contextLabel: "Context (optional)",
    contextPlaceholder: "e.g., CS101, HackMIT 2026, Book Club #3",
    contextHelp:
      "Course code, hackathon name, or group identifier for exact-match filtering.",
    lookingForLabel: "Looking for",
    lookingForPlaceholder: "e.g., 3",
    lookingForHelp: "Number of people (1-10)",
    modeLabel: "Mode",
    expiresOnLabel: "Expires on",
    expiresOnHelp: "Default: 90 days from today",
    autoAcceptLabel: "Auto-accept",
    autoAcceptHelp: "Instantly accept anyone who joins (no manual review)",
    createButton: "Create Posting",
    creatingButton: "Creating...",
    cancelButton: "Cancel",

    locationModeLabel: "Location Mode",
    locationLabel: "Location",
    locationPlaceholder: "e.g., Berlin, Germany",
    locationSearchPlaceholder: "Search for a location...",
    maxDistanceLabel: "Max Distance (km)",
    maxDistancePlaceholder: "e.g., 50",
    maxDistanceHelp:
      "Maximum distance for in-person collaboration. Used as a hard filter in matching.",
    manualEntryButton: "Manual entry",
    searchLocationButton: "Search location",

    categoryOptions: {
      study: "Study",
      hackathon: "Hackathon",
      personal: "Personal",
      professional: "Professional",
      social: "Social",
    } as const,
    locationModeOptions: {
      either: "Flexible",
      remote: "Remote",
      in_person: "In-person",
    } as const,
    modeOptions: {
      open: "Open",
      friend_ask: "Sequential Invite",
    } as const,
  },

  // ---------------------------------------------------------------------------
  // GitHub integration card
  // ---------------------------------------------------------------------------
  github: {
    cardTitle: "GitHub Profile Enrichment",
    cardDescription:
      "Automatically enrich your profile with skills, interests, and experience from your GitHub activity",
    connectInfo:
      "Connect your GitHub account from the Integrations section below to automatically analyze your repositories, commit messages, and coding style to enrich your profile with insights from your code.",
    syncButton: "Sync Now",
    syncingButton: "Syncing...",
    lastSynced: (date: string, time: string) =>
      `Last synced: ${date} at ${time}`,
    usernameLabel: "GitHub Username",
    activityLabel: "Activity",
    languagesLabel: "Languages Detected",
    codingStyleLabel: "Coding Style",
    experienceSignalsLabel: "Experience Signals",
    suggestionsTitle: "Suggestions from your GitHub",
    suggestedSkillsLabel: "Suggested Skills",
    suggestedInterestsLabel: "Suggested Interests",
    suggestedBioLabel: "Suggested Bio",
    addAllButton: "Add All",
    useThisButton: "Use This",
    syncHelp:
      "Click \u201cSync Now\u201d to analyze your GitHub profile and automatically enrich your profile with skills, interests, and experience level based on your repositories and commits.",
  },

  // ---------------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------------
  onboarding: {
    pageTitle: "Complete your profile",
    pageSubtitle:
      "Tell us about yourself so we can help you find the right postings and collaborators.",
    loadingMessage: "Loading your profile\u2026",
    suspenseFallback: "Loading...",
    saveButton: "Save profile",
    savingButton: "Saving...",
    skipButton: "Skip for now",

    generalInfoTitle: "General Information",
    generalInfoDescription:
      "Share the essentials about who you are and how you like to work.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "e.g., Alex Johnson",
    headlineLabel: "Headline",
    headlinePlaceholder: "e.g., Full-stack developer",
    bioLabel: "About you",
    bioPlaceholder: "What do you enjoy building? What makes you unique?",
    locationLabel: "Location (optional)",
    locationPlaceholder: "e.g., Lagos, Remote",
    availabilityLabel: "Availability (hrs/week)",
    availabilityPlaceholder: "e.g., 10",
    experienceLevelLabel: "Experience level",
    collaborationStyleLabel: "Collaboration style",
    skillsLabel: "Skills (comma-separated)",
    skillsPlaceholder: "e.g., React, TypeScript, Supabase",
    interestsLabel: "Interests (comma-separated)",
    interestsPlaceholder: "e.g., AI, fintech, education",
    portfolioLabel: "Portfolio link (optional)",
    portfolioPlaceholder: "https://your-portfolio.com",
    githubLabel: "GitHub link (optional)",
    githubPlaceholder: "https://github.com/username",

    preferencesTitle: "Posting Preferences",
    preferencesDescription:
      "Tell us what kinds of postings you\u2019re excited to join.",
    projectTypesLabel: "Posting types (comma-separated)",
    projectTypesPlaceholder: "e.g., SaaS, hackathon, open source",
    preferredRolesLabel: "Preferred roles (comma-separated)",
    preferredRolesPlaceholder: "e.g., Frontend, Backend, PM",
    preferredStackLabel: "Preferred tech stack (comma-separated)",
    preferredStackPlaceholder: "e.g., React, Node, Postgres",
    commitmentLevelLabel: "Time commitment",
    timelinePreferenceLabel: "Timeline preference",

    experienceLevelOptions: {
      junior: "Junior",
      intermediate: "Intermediate",
      senior: "Senior",
      lead: "Lead",
    } as const,
    collaborationStyleOptions: {
      async: "Mostly async",
      sync: "Mostly sync",
      hybrid: "Hybrid",
    } as const,
    commitmentOptions: {
      "5": "5 hrs/week",
      "10": "10 hrs/week",
      "15": "15 hrs/week",
      "20": "20+ hrs/week",
    } as const,
    timelineOptions: {
      weekend: "This weekend",
      "1_week": "1 week",
      "1_month": "1 month",
      ongoing: "Ongoing",
    } as const,

    errorNotSignedIn: "Please sign in again to save your profile.",
    errorSaveFailed: "We couldn\u2019t save your profile. Please try again.",
    errorEmptyText:
      "Please paste some text to extract profile information from.",
  },

  // ---------------------------------------------------------------------------
  // Input mode toggle
  // ---------------------------------------------------------------------------
  inputModeToggle: {
    formButton: "Fill Form",
    aiButton: "AI Extract",
  },
} as const;
