/**
 * Centralized user-facing labels for Mesh.
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
      sequential_invite: "Invite",
      new_message: "New Message",
      new_group_message: "New Team Message",
      match_found: "Match Found",
    } as const,
    dropdownTitle: "Notifications",
    markAllRead: "Mark all as read",
    empty: "No notifications",
    viewAll: "View all",
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

    footerCopyright: "\u00a9 2026 Mesh. All rights reserved.",
    privacyLink: "Privacy",
    termsLink: "Terms",
  },

  // ---------------------------------------------------------------------------
  // Site metadata / SEO
  // ---------------------------------------------------------------------------
  meta: {
    title: "Mesh - Find Your Perfect Match",
    description:
      "Find people for hackathons, study groups, side projects, and more. Describe what you want to do and get matched with the right collaborators.",
    appName: "Mesh",
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
    teamSizeMinLabel: "Min team size",
    teamSizeMinPlaceholder: "Min people needed (1-10)",
    teamSizeMinHelp: "Minimum people to start the project",
    lookingForLabel: "Looking for",
    lookingForPlaceholder: "e.g., 3",
    lookingForHelp: "Number of people (1-10)",
    visibilityLabel: "Visibility",
    visibilityHelp: "Public = discoverable by everyone. Private = invite only.",
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
    visibilityOptions: {
      public: "Public",
      private: "Private",
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
    languagesLabel: "Spoken languages (comma-separated)",
    languagesPlaceholder: "e.g., en, de, es",
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

  // ---------------------------------------------------------------------------
  // Common / shared strings
  // ---------------------------------------------------------------------------
  common: {
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    saveChanges: "Save changes",
    loading: "Loading...",
    signIn: "Sign in",
    signOut: "Sign out",
    signUp: "Sign up",
    edit: "Edit",
    delete: "Delete",
    backToDashboard: "Back",
    backToPostings: "Back to postings",
    backToDiscover: "Back to discover",
    newPosting: "New Posting",
    goToProfile: "Go to Profile",
    filter: "Filter",
    clearAll: "Clear all",
    searchPlaceholder: 'Try "remote React, 10+ hours/week"...',
    orContinueWith: "Or continue with",
    emailLabel: "Email",
    passwordLabel: "Password",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    unknownUser: "Unknown User",
    unknown: "Unknown",
    member: "Member",
    repost: "Repost",
    disconnect: "Disconnect",
    connect: "Connect",
    connecting: "Connecting...",
    primary: "Primary",
    connected: "Connected",
    notConnected: "Not connected",
    expired: "Expired",
  } as const,

  // ---------------------------------------------------------------------------
  // Error page
  // ---------------------------------------------------------------------------
  error: {
    title: "Something went wrong",
    description:
      "We encountered an unexpected error. Our team has been notified and is working on a fix.",
    errorIdPrefix: "Error ID: ",
    tryAgain: "Try again",
    goHome: "Go home",
  },

  // ---------------------------------------------------------------------------
  // Not found page
  // ---------------------------------------------------------------------------
  notFound: {
    title: "Page not found",
    description:
      "Sorry, we couldn\u2019t find the page you\u2019re looking for. It might have been moved or doesn\u2019t exist.",
    goHome: "Go home",
    goBack: "Go back",
  },

  // ---------------------------------------------------------------------------
  // Offline page
  // ---------------------------------------------------------------------------
  offline: {
    title: "You\u2019re Offline",
    description:
      "It looks like you\u2019ve lost your internet connection. Don\u2019t worry, some features may still work with cached content.",
    whatYouCanDo: "What you can do:",
    viewPreviousPages: "View previously loaded pages",
    browseCachedContent: "Browse cached content",
    requiresConnection: "New matches and messages require connection",
    tryAgain: "Try Again",
    goToHome: "Go to Home",
  },

  // ---------------------------------------------------------------------------
  // Auth pages (login, signup, forgot-password, reset-password)
  // ---------------------------------------------------------------------------
  auth: {
    login: {
      title: "Welcome back",
      subtitle: "Sign in to continue to Mesh.",
      signingIn: "Signing in...",
      forgotPassword: "Forgot password?",
      noAccount: "Don\u2019t have an account?",
    },
    signup: {
      title: "Create an account",
      subtitle: "Sign up to get started with Mesh.",
      creatingAccount: "Creating account...",
      confirmPasswordLabel: "Confirm Password",
      alreadyHaveAccount: "Already have an account?",
      checkEmail: "Check your email to confirm your account.",
      errorPasswordMismatch: "Passwords do not match.",
      errorPasswordLength: "Password must be at least 6 characters.",
    },
    forgotPassword: {
      title: "Forgot password?",
      subtitle: "Enter your email and we\u2019ll send you a reset link.",
      sending: "Sending...",
      sendResetLink: "Send reset link",
      rememberPassword: "Remember your password?",
      checkEmail: "Check your email for a password reset link.",
    },
    resetPassword: {
      title: "Reset password",
      subtitle: "Enter your new password below.",
      newPasswordLabel: "New Password",
      confirmPasswordLabel: "Confirm Password",
      updating: "Updating...",
      updatePassword: "Update password",
      success: "Password updated successfully! Redirecting...",
      errorPasswordMismatch: "Passwords do not match.",
      errorPasswordLength: "Password must be at least 6 characters.",
    },
  },

  // ---------------------------------------------------------------------------
  // Dashboard page
  // ---------------------------------------------------------------------------
  dashboard: {
    title: "Dashboard",
    subtitle:
      "Welcome back! Here\u2019s what\u2019s happening with your postings.",
    recentActivity: "Recent Activity",
    recentActivityDescription:
      "Your latest matches, join requests, and messages",
    signInToSeeActivity: "Sign in to see your recent activity",
  },

  // ---------------------------------------------------------------------------
  // Quick actions
  // ---------------------------------------------------------------------------
  quickActions: {
    title: "Quick Actions",
    subtitle: "Common tasks to get started",
    createPosting: "Create Posting",
    createPostingDescription: "Find collaborators for your idea",
    reviewMatches: "Review Matches",
    reviewMatchesDescription: "See postings that match your profile",
    browsePostings: "Browse Postings",
    browsePostingsDescription: "Discover postings looking for people like you",
  },

  // ---------------------------------------------------------------------------
  // Matches page
  // ---------------------------------------------------------------------------
  matches: {
    title: "Matches",
    subtitle: "Postings that match your skills and interests",
    profileIncomplete: "Profile Incomplete",
    unableToFindMatches: "Unable to Find Matches",
    profileIncompleteHint:
      "Add a description and skills to your profile so we can find relevant matches for you.",
    emptyTitle: "No matches yet",
    emptyDescription:
      "Complete your profile to start seeing matches that align with your skills and interests.",
    completeProfile: "Complete Profile",
    failedToLoadMatches: "Failed to load matches",
  },

  // ---------------------------------------------------------------------------
  // Bookmarks page
  // ---------------------------------------------------------------------------
  bookmarks: {
    title: "Bookmarks",
    subtitle: "Postings you\u2019ve saved for later",
    emptyTitle: "No bookmarks yet",
    emptyDescription:
      "Browse postings and bookmark ones you\u2019re interested in.",
    browsePostings: "Browse Postings",
  },

  // ---------------------------------------------------------------------------
  // Inbox page
  // ---------------------------------------------------------------------------
  inbox: {
    title: "Inbox",
    subtitle: "Notifications and messages",
    notificationsTab: "Notifications",
    messagesTab: "Messages",
    selectConversation: "Select a conversation to start messaging",
    markAllAsRead: "Mark all as read",
    noNotifications: "No notifications yet",
    joinAction: "Join",
    doNotJoinAction: "Do not join",
  },

  // ---------------------------------------------------------------------------
  // Chat / conversations
  // ---------------------------------------------------------------------------
  chat: {
    noConversations: "No conversations yet",
    startByContacting: "Start by contacting a posting creator",
    youPrefix: "You: ",
    noMessages: "No messages yet. Start the conversation!",
    messagePlaceholder: "Type a message...",
    connectionConnected: "Connected",
    connectionConnecting: "Connecting...",
    coverMessagePlaceholder:
      "Tell the posting creator why you\u2019d like to join... (optional)",
  },

  // ---------------------------------------------------------------------------
  // Settings page
  // ---------------------------------------------------------------------------
  settings: {
    title: "Settings",
    subtitle: "Manage your account preferences",
    accountTitle: "Account",
    accountDescription: "Your account information",
    accountTypeLabel: "Account type",
    connectedAccountsTitle: "Connected Accounts",
    connectedAccountsDescription:
      "Link multiple providers to access all features. You need at least one connected account.",
    githubSyncTitle: "GitHub Profile Sync",
    githubSyncDescription:
      "Automatically enrich your profile with data from your GitHub account",
    lastSyncedLabel: "Last synced:",
    statusLabel: "Status:",
    syncGithubButton: "Sync GitHub Profile",
    notificationPrefsTitle: "Notification Preferences",
    notificationPrefsDescription:
      "Choose which notifications you receive in-app and in the browser",
    tableType: "Type",
    tableInApp: "In-App",
    tableBrowser: "Browser",
    profileTitle: "Profile",
    profileDescription: "View and edit your profile details",
    dangerZoneTitle: "Danger Zone",
    dangerZoneDescription: "Irreversible account actions",
    signOutDescription: "Sign out of your account on this device",
    disconnectDialogTitle: (provider: string) => `Disconnect ${provider}?`,
    disconnectDialogDescription: (provider: string) =>
      `This will remove ${provider} from your connected accounts. You can reconnect it later if needed.`,
    disconnectGithubNote:
      "Note: Disconnecting GitHub will prevent automatic profile syncing.",
    errorMinOneAccount: "You must have at least one connected account",
    errorSignInAgain: "Please sign in again",
    errorProviderNotFound: "Provider not found",
    providerNames: {
      google: "Google",
      github: "GitHub",
      linkedin_oidc: "LinkedIn",
    } as const,
  },

  // ---------------------------------------------------------------------------
  // Profile page
  // ---------------------------------------------------------------------------
  profile: {
    title: "Your Profile",
    editButton: "Edit Profile",
    updateSuccess: "Profile updated successfully!",
  },

  // ---------------------------------------------------------------------------
  // Profile form (edit mode)
  // ---------------------------------------------------------------------------
  profileForm: {
    generalInfoTitle: "General Information",
    generalInfoDescription: "Share the essentials about who you are.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "e.g., Alex Johnson",
    headlineLabel: "Headline",
    headlinePlaceholder: "e.g., Full-stack developer",
    bioLabel: "About you",
    bioPlaceholder: "What do you enjoy building? What makes you unique?",
    locationLabel: "Location",
    locationSearchPlaceholder: "Search for a location...",
    locationManualPlaceholder: "e.g., Berlin, Germany",
    locationHelp:
      "Use the buttons below to auto-fill your location, or type manually.",
    gettingLocation: "Getting location...",
    useCurrentLocation: "Use current location",
    manualEntry: "Manual entry",
    searchLocation: "Search location",
    languagesLabel: "Spoken languages (comma-separated)",
    languagesPlaceholder: "e.g., en, de, es",
    languagesHelp:
      "Use ISO codes: en (English), de (German), es (Spanish), fr (French), etc.",
    interestsLabel: "Interests (comma-separated)",
    interestsPlaceholder: "e.g., AI, fintech, education",
    portfolioLabel: "Portfolio link",
    portfolioPlaceholder: "https://your-portfolio.com",
    githubLabel: "GitHub link",
    githubPlaceholder: "https://github.com/username",
    skillsTitle: "Skills",
    skillsDescription:
      "Search or browse the skill tree and rate your proficiency (0-10).",
    skillsPlaceholder: "Search skills (e.g., React, Piano, Photography)...",
    locationModeTitle: "Location Mode",
    locationModeDescription: "Where do you prefer to collaborate?",
    availabilityTitle: "Availability",
    availabilityDescription: "Mark the times you are unavailable.",
    locationModeOptions: {
      remote: "Remote",
      in_person: "In-person",
      either: "Flexible",
    } as const,
  },

  // ---------------------------------------------------------------------------
  // Public profile page
  // ---------------------------------------------------------------------------
  publicProfile: {
    profileNotFound: "Profile not found.",
    aboutTitle: "About",
    skillsTitle: "Skills",
    skillLevels: {
      beginner: "Beginner",
      canFollowTutorials: "Can follow tutorials",
      intermediate: "Intermediate",
      advanced: "Advanced",
      expert: "Expert",
    } as const,
  },

  // ---------------------------------------------------------------------------
  // Postings listing page
  // ---------------------------------------------------------------------------
  postings: {
    title: "Postings",
    subtitle: "Discover postings or manage your own",
    tabs: {
      discover: "Discover",
      myPostings: "My Postings",
    } as const,
    categories: {
      all: "All",
      study: "Study",
      hackathon: "Hackathon",
      personal: "Personal",
      professional: "Professional",
      social: "Social",
    } as const,
    filtersTitle: "Filters",
    visibilityLabel: "Visibility",
    visibilityAny: "Any",
    visibilityPublic: "Public",
    visibilityPrivate: "Private",
    noPostingsOwner: "You haven\u2019t created any postings yet.",
    noPostingsDiscover: "No postings found.",
    createFirstPosting: "Create your first posting",
  },

  // ---------------------------------------------------------------------------
  // Posting detail page / header / sidebar
  // ---------------------------------------------------------------------------
  postingDetail: {
    postingNotFound: "Posting not found.",
    browsePostings: "Browse Postings",
    tabs: {
      edit: "Edit",
      manage: "Manage",
      project: "Project",
    } as const,
    projectComingSoon: "Group chat coming soon",
    projectDisabled: "Available when minimum team size is reached",
    saving: "Saving...",
    joiningWaitlist: "Joining waitlist...",
    requesting: "Requesting...",
    requestingToJoin: "Requesting to join...",
    joining: "Joining...",
    postingStatus: (status: string) => `Posting ${status}`,
    postedBy: "Posted by",
    match: "match",
    deleteConfirm:
      "Are you sure you want to delete this posting? This action cannot be undone.",
    repostTitle: "Repost this posting?",
    repostDescription:
      "This will remove all existing join requests and repost the posting as fresh. This action cannot be undone.",

    // Sidebar
    postingCreator: "Posting Creator",
    contactCreator: "Contact Creator",
    actionsTitle: "Actions",
    linkCopied: "Link Copied!",
    sharePosting: "Share Posting",
    reportIssue: "Report Issue",
    shareTitle: "Check out this posting on Mesh",

    // Error messages
    errorUpdatePosting: "Failed to update posting. Please try again.",
    errorUpdateSkills: "Failed to update skills. Please try again.",
    errorSaveSkills: "Failed to save skills. Please try again.",
    errorDeletePosting: "Failed to delete posting. Please try again.",
    errorExtendDeadline: "Failed to extend deadline. Please try again.",
    errorRepost: "Failed to repost. Please try again.",
    errorSubmitRequest: "Failed to submit request. Please try again.",
    errorWithdrawRequest: "Failed to withdraw request. Please try again.",
    errorUpdateRequest: "Failed to update request. Please try again.",
    errorStartConversation: "Failed to start conversation. Please try again.",

    // Notifications (created programmatically)
    waitlistPromotedTitle: "You\u2019re in! \ud83c\udf89",
    waitlistPromotedBody: (title: string) =>
      `A spot opened on "${title}" and you\u2019ve been promoted from the waitlist!`,
    waitlistReadyTitle: "Spot opened \u2014 waitlist ready",
    waitlistReadyBody: (title: string) =>
      `A spot opened on "${title}". You have waitlisted people ready to accept.`,
    requestAcceptedTitle: "Request Accepted! \ud83c\udf89",
    requestUpdateTitle: "Request Update",
    requestAcceptedBody: (title: string) =>
      `Your request to join "${title}" has been accepted!`,
    requestRejectedBody: (title: string) =>
      `Your request to join "${title}" was not selected.`,

    // Extend deadline
    extendOptions: {
      "7": "7 days",
      "14": "14 days",
      "30": "30 days",
    } as const,

    // Waitlist position
    waitlistPosition: (pos: number) => `\u2014 #${pos} in line`,
  },

  // ---------------------------------------------------------------------------
  // Navigation (header + sidebar)
  // ---------------------------------------------------------------------------
  nav: {
    dashboard: "Dashboard",
    postings: "Postings",
    matches: "Matches",
    bookmarks: "Bookmarks",
    inbox: "Inbox",
    discover: "Discover",
    myPostings: "My Postings",
    active: "Active",
    connections: "Connections",
    profile: "Profile",
    settings: "Settings",
    notifications: "Notifications",
    userMenu: "User menu",
    toggleMenu: "Toggle menu",
    mainNavigation: "Main navigation",
    secondaryNavigation: "Secondary navigation",
    copyright: "\u00a9 2026 Mesh",
  },

  // ---------------------------------------------------------------------------
  // Skill picker
  // ---------------------------------------------------------------------------
  skill: {
    levelLabels: {
      beginner: "Beginner",
      canFollowTutorials: "Can follow tutorials",
      intermediate: "Intermediate",
      advanced: "Advanced",
      expert: "Expert",
    } as const,
    allCategories: "All",
    addCustomPrefix: "Add \u201c",
    addCustomSuffix: "\u201d as a new skill",
    noSkillsFound: "No skills found",
    noCategoriesAvailable: "No categories available",
    addingSkill: "Adding skill...",
    searching: "Searching...",
    kbdNavigate: "navigate",
    kbdSelect: "select",
    kbdClose: "close",
    anyLevel: "Any level",
    anyLevelWelcome: "Any level welcome",
    requiresAtLeast: (label: string) => `Requires at least: ${label}`,
  },

  // ---------------------------------------------------------------------------
  // Invite (sequential + parallel)
  // ---------------------------------------------------------------------------
  invite: {
    title: "Invite Connections",
    sequentialDescription:
      "Invite your connections one by one in order. Each person can join or pass before the next is asked.",
    parallelDescription:
      "Invite all selected connections at once. The first to accept wins.",
    starting: "Starting...",
    startButton: "Start Invite",
    cancelInvite: "Cancel Invite",
    progressTitle: "Invite Progress",
    modeLabel: "Invite mode",
    modeSequential: "Sequential",
    modeParallel: "Parallel",
    modeSequentialHelp: "Ask one at a time, in order",
    modeParallelHelp: "Ask everyone at once",
    statusLabels: {
      pending: "In Progress",
      accepted: "Accepted",
      completed: "Completed",
      cancelled: "Cancelled",
    } as const,
    acceptedSummary: (name: string) => `${name} accepted the invite`,
    completedSummary: (count: number) =>
      `All ${count} connections were asked \u2014 no one accepted`,
    cancelledSummary: "This invite was cancelled",
    privateBadge: "Private",
    invitedTitle: "You\u2019ve been invited!",
    invitedDescription:
      "The posting creator has invited you to join. Would you like to accept?",
    joinButton: "Join",
    declineButton: "Do not join",
    joinedMessage: "You joined this posting!",
    declinedMessage: "You declined this invite.",
    notInvitedMessage:
      "This posting uses Invite \u2014 the poster will invite connections directly.",
    waitingSummary: (current: number, total: number) =>
      `${current} of ${total} \u2014 waiting for response`,
    parallelWaitingSummary: (responded: number, total: number) =>
      `${responded} of ${total} responded \u2014 waiting for others`,
  },

  // ---------------------------------------------------------------------------
  // Connections
  // ---------------------------------------------------------------------------
  connections: {
    noConnections: "No connections yet",
    pendingRequests: "Pending Requests",
    sentRequests: "Sent Requests",
    connectionsCount: (n: number) => `Connections (${n})`,
    pending: "Pending",
  },

  // ---------------------------------------------------------------------------
  // Match card
  // ---------------------------------------------------------------------------
  matchCard: {
    matchSuffix: "% match",
    accept: "Accept",
    message: "Message",
    availablePrefix: "Available: ",
  },

  // ---------------------------------------------------------------------------
  // Online status & typing indicator
  // ---------------------------------------------------------------------------
  status: {
    online: "Online",
    offline: "Offline",
    isTyping: (name: string) => `${name} is typing...`,
    typing: "typing...",
  },

  // ---------------------------------------------------------------------------
  // Feedback widget
  // ---------------------------------------------------------------------------
  feedback: {
    buttonAriaLabel: "Send feedback",
    sheetTitle: "Send Feedback",
    sheetDescription:
      "Let us know about bugs, irritations, or suggestions. Your feedback helps us improve.",
    messagePlaceholder:
      "What's on your mind? Describe a bug, something that annoyed you, or a suggestion...",
    moodLabel: "How are you feeling?",
    moods: {
      frustrated: "Frustrated",
      neutral: "Neutral",
      happy: "Happy",
    } as const,
    submitButton: "Send feedback",
    submittingButton: "Sending...",
    successMessage: "Thank you for your feedback!",
    errorGeneric: "Something went wrong. Please try again.",
    errorEmptyMessage: "Please enter a message.",
  },

  // ---------------------------------------------------------------------------
  // Quick Update (free-form AI update card)
  // ---------------------------------------------------------------------------
  quickUpdate: {
    profile: {
      title: "Quick Update",
      description:
        "Describe what changed and your profile fields will update automatically.",
      sourceLabel: "Profile description",
      sourcePlaceholder:
        "Paste or type your profile description here (e.g., a short bio, your skills, what you\u2019re looking for)...",
      instructionLabel: "What changed?",
      instructionPlaceholder:
        "e.g., I also know Python now and am available 20 hours/week",
    },
    posting: {
      title: "Quick Update",
      description:
        "Describe what changed and your posting fields will update automatically.",
      sourceLabel: "Posting description",
      sourcePlaceholder: "Paste or type your posting description here...",
      instructionLabel: "What changed?",
      instructionPlaceholder:
        "e.g., change the title to X and add Python to skills",
    },
    applyButton: "Apply Update",
    applyingButton: "Applying...",
    undoButton: "Undo",
    networkError: "Network error. Please try again.",
  },

  // ---------------------------------------------------------------------------
  // Skip link (accessibility)
  // ---------------------------------------------------------------------------
  a11y: {
    skipToMainContent: "Skip to main content",
    toggleTheme: "Toggle theme",
  },

  // ---------------------------------------------------------------------------
  // Discover page (merged postings discover + matches + bookmarks)
  // ---------------------------------------------------------------------------
  discover: {
    title: "Discover",
    subtitle: "Find postings that match your skills and interests",
    savedFilter: "Saved",
    sortByMatch: "Best match",
    sortByRecent: "Most recent",
    noResults: "No postings found.",
    noSavedPostings:
      "No saved postings yet. Express interest in postings to save them here.",
  },

  // ---------------------------------------------------------------------------
  // My Postings page
  // ---------------------------------------------------------------------------
  myPostings: {
    title: "My Postings",
    subtitle: "Manage your postings and track applicants",
    pendingRequests: (n: number) => `${n} pending request${n !== 1 ? "s" : ""}`,
    noPostings: "You haven\u2019t created any postings yet.",
    createFirst: "Create your first posting",
  },

  // ---------------------------------------------------------------------------
  // Active page (placeholder)
  // ---------------------------------------------------------------------------
  active: {
    title: "Active",
    subtitle: "Your active postings",
    youCreated: "You created",
    youJoined: "You joined",
    empty: "No active postings yet",
    emptyDescription:
      "Postings appear here once the minimum team size is reached.",
    discoverCta: "Discover postings",
    unreadMessages: (n: number) => `${n} unread message${n !== 1 ? "s" : ""}`,
  },

  // ---------------------------------------------------------------------------
  // Group chat
  // ---------------------------------------------------------------------------
  groupChat: {
    noMessages: "No messages yet. Start the conversation with your team!",
    messagePlaceholder: "Message the team...",
    isTyping: (name: string) => `${name} is typing\u2026`,
    multipleTyping: (names: string[]) =>
      `${names.join(" and ")} are typing\u2026`,
    memberCount: (n: number) => `${n} member${n !== 1 ? "s" : ""}`,
    onlineCount: (n: number) => `${n} online`,
    sendMessage: "Send message",
    teamChat: "Team Chat",
  },

  // ---------------------------------------------------------------------------
  // Connections page
  // ---------------------------------------------------------------------------
  connectionsPage: {
    title: "Connections",
    subtitle: "Your network and messages",
    comingSoon: "Coming soon",
    comingSoonDescription:
      "Manage your connections, view mutual interests, and start conversations with collaborators.",
    searchPlaceholder: "Search connections...",
    noConnections: "No connections yet",
    noConnectionsHint: "Add people you know to start connecting",
    selectConnection: "Select a connection to start chatting",
    pendingRequestsTitle: "Connection Requests",
    addConnection: "+ Add",
    qrCode: "QR Code",
    shareLink: "Share Link",
    linkCopied: "Link copied!",
    downloadQr: "Download QR",
    copyLink: "Copy Link",
    qrCodeTitle: "Your QR Code",
    qrCodeDescription: (name: string) => `Scan to connect with ${name}`,
    addConnectionTitle: "Add Connection",
    addConnectionSubtitle: "Search for people to connect with",
    searchPeoplePlaceholder: "Search by name...",
    noResults: "No people found",
    connectButton: "Connect",
    requestSent: "Request Sent",
    startConversationOnSend: "Send a message to start a conversation",
  },

  // ---------------------------------------------------------------------------
  // Public profile connection actions
  // ---------------------------------------------------------------------------
  connectionAction: {
    connect: "Connect",
    requestPending: "Request Pending",
    accept: "Accept",
    decline: "Decline",
    connected: "Connected",
    message: "Message",
  },

  // ---------------------------------------------------------------------------
  // Availability
  // ---------------------------------------------------------------------------
  availability: {
    // Quick/Detailed mode toggle
    quickMode: "Quick",
    detailedMode: "Detailed",
    quickModeHint: "Toggle time blocks when you are NOT available.",
    detailedModeHint:
      "Drag to block out times you are not available on the weekly calendar.",

    // Posting availability mode
    postingAvailabilityTitle: "Availability",
    modeFlexible: "Flexible",
    modeFlexibleDescription:
      "No specific schedule — collaborators can work anytime.",
    modeRecurring: "Recurring weekly",
    modeRecurringDescription:
      "Set weekly time windows when the team should be available.",
    modeSpecificDates: "Specific dates",
    modeSpecificDatesDescription:
      "Pick exact dates and times for collaboration.",
    specificDatesComingSoon: "Specific date selection coming soon.",
  },

  // ---------------------------------------------------------------------------
  // Calendar sync
  // ---------------------------------------------------------------------------
  calendar: {
    settingsTitle: "Calendar Sync",
    settingsDescription:
      "Connect your calendar to automatically factor real-world busy times into availability matching.",
    googleConnect: "Connect Google Calendar",
    googleConnecting: "Connecting...",
    googleConnected: "Google Calendar connected",
    icalConnect: "Connect iCal Feed",
    icalPlaceholder: "https://calendar.example.com/feed.ics",
    icalSubmit: "Add iCal Feed",
    icalAdding: "Adding...",
    disconnect: "Disconnect",
    disconnecting: "Disconnecting...",
    syncNow: "Sync Now",
    syncing: "Syncing...",
    lastSynced: (date: string) => `Last synced: ${date}`,
    syncStatusLabels: {
      pending: "Pending",
      syncing: "Syncing",
      synced: "Synced",
      error: "Error",
    } as const,
    syncError: (msg: string) => `Sync error: ${msg}`,
    busyBlockLabel: "Calendar busy",
    visibilityTitle: "Calendar Visibility",
    visibilityDescription: "Control who can see your calendar busy times.",
    visibilityMatchOnly: "Match scoring only",
    visibilityMatchOnlyDescription:
      "Calendar data only affects match scores. No one sees your busy times.",
    visibilityTeamVisible: "Team members can see",
    visibilityTeamVisibleDescription:
      "Team members on accepted postings can see when you're busy.",
    disconnectConfirmTitle: "Disconnect calendar?",
    disconnectConfirmDescription:
      "This will remove the calendar connection and all imported busy blocks. Your availability windows will not be affected.",
    noConnections: "No calendars connected yet.",
    errorGeneric: "Something went wrong. Please try again.",
    errorInvalidIcalUrl:
      "Please enter a valid iCal URL (must start with http:// or https://).",
  },

  // ---------------------------------------------------------------------------
  // Team scheduling (Phase 5)
  // ---------------------------------------------------------------------------
  scheduling: {
    sectionTitle: "Team Scheduling",
    commonAvailabilityTitle: "Common Availability",
    noCommonSlots: "No common free time found across all team members.",
    proposeButton: "Propose Meeting",
    proposalsTitle: "Meeting Proposals",
    noProposals: "No meetings proposed yet.",
    titlePlaceholder: "Meeting title (optional)",
    durationLabel: "Duration",
    startLabel: "Start time",
    responseAvailable: "Available",
    responseUnavailable: "Unavailable",
    statusProposed: "Proposed",
    statusConfirmed: "Confirmed",
    statusCancelled: "Cancelled",
    confirmButton: "Confirm",
    cancelButton: "Cancel Meeting",
    exportGoogleCalendar: "Add to Google Calendar",
    exportIcs: "Download .ics",
    respondedCount: (n: number, total: number) => `${n} of ${total} responded`,
    dragToSelectHint: "Drag on the calendar to select a meeting time.",
  },
} as const;
