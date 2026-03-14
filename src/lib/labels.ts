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
      meeting_proposal: "Meeting Proposal",
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
    heroBadge: "Activity-first coordination",
    heroTitle: "Stop coordinating through back-and-forth messages.",
    heroSubheadline:
      "Post what you want to do \u2014 a hackathon, a study group, a side project \u2014 and Mesh handles finding the right people.",
    postSomethingButton: "Post something",
    explorePostingsButton: "Explore postings",
    whyMeshButton: "Why Mesh?",

    problemSectionTitle: "Messaging wasn\u2019t designed for coordination",
    problemGroupChatsTitle: "Group chats",
    problemGroupChatsBody:
      "100 people see your message, 5 are interested \u2014 and you still have to negotiate one by one.",
    problemMeetupsTitle: "Events & meetups",
    problemMeetupsBody:
      "Designed for larger gatherings, not the small teams of 2\u20135 where most coordination happens.",
    problemForumsTitle: "Job boards & forums",
    problemForumsBody:
      "Often too formal and slow for a weekend hackathon or a spontaneous idea.",
    problemConclusion:
      "They mostly treat your activity as just another message. Mesh treats it as a structured posting the platform can act on.",

    useCaseSectionTitle: "Works for any kind of activity",
    useCaseSectionSubtitle:
      "From study partners to startup co-founders \u2014 post what you want to do and find the right people.",

    // Scenario comparison section
    scenarioSectionTitle: "See the difference",
    scenarioSectionSubtitle: "Side by side: the old way vs. the Mesh way.",
    scenarioWithoutMesh: "Without Mesh",
    scenarioWithMesh: "With Mesh",

    scenarios: {
      quickCall: {
        title: "Quick Call",
        emoji: "\u{1F4DE}",
        subtitle: "\u201CCan we talk for 15 minutes?\u201D",
        without: [
          { sender: "Alex", text: "Quick call about the API redesign?" },
          { sender: "Kim", text: "Sure, when?" },
          { sender: "Alex", text: "How about now?" },
          { sender: "Kim", text: "In a meeting until 14:30." },
          { sender: "Alex", text: "14:30 works. Phone or video?" },
          { sender: "Kim", text: "Phone. My number is +49\u2026" },
          { sender: "Alex", text: "Actually 14:45 is better." },
        ],
        withMeshSteps: [
          "Alex posts: \u201CQuick call about API redesign, 15 min\u201D",
          "Kim sees time slots that fit both calendars: 14:45 \u2022 15:00 \u2022 15:30",
          "Kim taps 14:45 \u2014 done.",
        ],
        statsBefore: { messages: "7 messages", time: "~20 min" },
        statsAfter: { messages: "1 tap", time: "~30 sec" },
      },
      groupDinner: {
        title: "Group Dinner",
        emoji: "\u{1F35D}",
        subtitle: "\u201CFriday dinner with 4 people\u201D",
        without: [
          { sender: "Alex", text: "Dinner Friday? Somewhere central?" },
          { sender: "Lena", text: "Sure! What time?" },
          { sender: "Kai", text: "Sounds good, where?" },
          {
            sender: "Priya",
            text: "Depends on time, I\u2019m in Garching until late.",
          },
          { sender: "Alex", text: "19:00? Osteria Italiana?" },
          { sender: "Priya", text: "19:00 is tight, 19:30 earliest." },
          { sender: "Lena", text: "19:30 works." },
          { sender: "Kai", text: "Either works." },
          { sender: "Priya", text: "Can we do 20:00 actually?" },
          { sender: "Alex", text: "Lena/Kai, is 20:00 ok?" },
          { sender: "Lena", text: "I need to leave by 21:30." },
          { sender: "Alex", text: "Let\u2019s keep 19:30." },
        ],
        withMeshSteps: [
          "Alex posts: \u201CFriday dinner, Italian place, central Munich, 3 spots\u201D",
          "Mesh checks calendars \u2014 skips Marco (busy), finds best overlap: 19:30",
          "Each invitee gets a one-tap acceptance card with the time and place.",
        ],
        statsBefore: { messages: "12+ messages", time: "hours" },
        statsAfter: { messages: "3 taps", time: "~2 min" },
      },
      tennis: {
        title: "Tennis Partner",
        emoji: "\u{1F3BE}",
        subtitle: "\u201CTennis this afternoon?\u201D",
        without: [
          { sender: "Alex", text: "Tennis this afternoon? Near Ostbahnhof?" },
          { sender: "Kai", text: "Sorry, meetings until 5." },
          { sender: "Alex", text: "Tennis this afternoon?" },
          { sender: "Marco", text: "(no reply for 40 min)" },
          { sender: "Alex", text: "Tennis? Near Ostbahnhof?" },
          { sender: "Priya", text: "What time?" },
          { sender: "Alex", text: "Like 3:30?" },
          { sender: "Priya", text: "I can do 4. Which courts?" },
        ],
        withMeshSteps: [
          "Alex posts: \u201CTennis this afternoon, intermediate, near Ostbahnhof\u201D",
          "Mesh auto-skips Kai (busy) and moves to the next available person.",
          "Priya gets a one-tap acceptance card with smart time slots.",
        ],
        statsBefore: { messages: "8+ messages", time: "40+ min" },
        statsAfter: { messages: "1 tap", time: "< 2 min" },
      },
      hackathon: {
        title: "Hackathon Team",
        emoji: "\u{1F4BB}",
        subtitle: "\u201CNeed 2 frontend devs for Saturday\u201D",
        without: [
          {
            sender: "You",
            text: "Frontend dev, React. Looking for an AI team.",
          },
          { sender: "Person A", text: "What stack?" },
          {
            sender: "You",
            text: "React/Next.js, interested in accessibility.",
          },
          { sender: "Person B", text: "DM\u2019d you, I do ML." },
          { sender: "Person A", text: "Time commitment?" },
          { sender: "You", text: "Full weekend." },
        ],
        withMeshSteps: [
          "Post your skills and what you\u2019re looking for in the hackathon channel.",
          "Mesh matches you with complementary skills: ML + Design + Backend.",
          "One-tap join \u2014 team assembled before the event starts.",
        ],
        statsBefore: { messages: "6+ DMs each", time: "1\u20132 hours" },
        statsAfter: { messages: "1 tap", time: "< 1 min" },
      },
    },

    howItWorksTitle: "How it works",
    howItWorksSubtitle: "One posting replaces all the back-and-forth.",
    howItWorksStep1Title: "Describe your activity",
    howItWorksStep1Body:
      "Paste text, speak, or type \u2014 Mesh extracts the structure (time, skills, team size) so the platform can act on it.",
    howItWorksStep2Title: "Find or invite the right people",
    howItWorksStep2Body:
      "Get matched with compatible people, or invite your connections in order \u2014 no manual back-and-forth.",
    howItWorksStep3Title: "Start doing the thing",
    howItWorksStep3Body:
      "The right people are assembled. Chat, plan, and go \u2014 whether it\u2019s a hackathon, a tennis match, or a startup.",

    featuresSectionTitle: "Built for getting things done",
    featuresSectionSubtitle:
      "Coordinate quickly, find the right people, and move on with your life.",
    smartMatchingTitle: "Understands what you need",
    smartMatchingBody:
      "Goes beyond keywords \u2014 matches on skills, context, and intent.",
    voiceTextInputTitle: "Just describe it",
    voiceTextInputBody:
      "Paste, type, or speak \u2014 no forms required to get started.",
    realtimeMessagingTitle: "Connect right away",
    realtimeMessagingBody:
      "Start planning together the moment you find a match.",
    smartCompatibilityTitle: "See why they fit",
    smartCompatibilityBody:
      "Skills, availability, location, and interest alignment \u2014 all at a glance.",

    sequentialInviteTitle: "Invite people in the order that matters",
    sequentialInviteBody:
      "Not everyone is equally available \u2014 or equally suited. Sequential invite lets you reach out in priority order, so you always end up with the best possible team.",
    sequentialInviteStep1: "Rank your preferred people",
    sequentialInviteStep2: "Mesh invites them one at a time",
    sequentialInviteStep3: "First to accept fills the slot",

    finalCtaTitle: "Ready to skip the back-and-forth?",
    ctaBody: "Post your activity and let Mesh handle finding the right people.",
    getStartedButton: "Get started free",

    footerCopyright: "\u00a9 2026 Mesh. All rights reserved.",
    privacyLink: "Privacy",
    termsLink: "Terms",
    whyMeshLink: "Why Mesh?",
  },

  // ---------------------------------------------------------------------------
  // Privacy page
  // ---------------------------------------------------------------------------
  privacy: {
    title: "Privacy Policy",
    body: "This page is a placeholder. A full privacy policy will be published before Mesh launches publicly.",
  },

  // ---------------------------------------------------------------------------
  // Terms page
  // ---------------------------------------------------------------------------
  terms: {
    title: "Terms of Service",
    body: "This page is a placeholder. A full terms of service will be published before Mesh launches publicly.",
  },

  // ---------------------------------------------------------------------------
  // Why Mesh page
  // ---------------------------------------------------------------------------
  why: {
    heroTitle: "Coordinating activities shouldn\u2019t mean endless messaging.",
    heroSubtitle:
      "Whether it\u2019s a hackathon team, a study group, or a tennis partner \u2014 you shouldn\u2019t have to message people one by one to make it happen.",

    smallGroupTitle: "The back-and-forth problem",
    smallGroupBody1:
      "Coordinating through messages means rounds of explaining, checking interest, negotiating schedules, and comparing fit. Each round trip takes minutes to hours. People drop out. Details scatter across threads.",
    smallGroupBody2:
      "This gets worse with group size \u2014 but even coordinating 2\u20133 people through DMs is surprisingly tedious. The back-and-forth is the bottleneck, not finding the activity.",

    problemTitle: "Why messaging apps struggle with this",
    problemGroupChatsTitle: "Group chats (Slack, Discord, WhatsApp)",
    problemGroupChatsBody:
      "They treat your activity as just another message. They can\u2019t check availability, match skills, or manage invites \u2014 so you end up doing it all manually.",
    problemMeetupsTitle: "Events and meetups",
    problemMeetupsBody:
      "Designed for larger gatherings, not the small teams of 2\u20135 that need real coordination.",
    problemForumsTitle: "Job boards and forums",
    problemForumsBody:
      "Often too formal and slow. By the time you\u2019ve posted and waited, the weekend is over.",
    problemConclusion:
      "The root cause: messaging apps don\u2019t know you\u2019re coordinating an activity, so they can\u2019t help you do it.",

    howDifferentTitle: "How Mesh replaces the back-and-forth",
    howDifferentActivityFirst: "Structured postings",
    howDifferentActivityFirstBody:
      "Your posting has structure \u2014 time, skills, team size \u2014 so the platform can check availability, match people, and manage invites for you.",
    howDifferentNoSetup: "No setup required",
    howDifferentNoSetupBody:
      "You don\u2019t need a profile to post. Describe your activity, and you\u2019re live in seconds.",
    howDifferentSmartMatching: "Find or invite",
    howDifferentSmartMatchingBody:
      "Get matched with compatible strangers, or invite people you know in your preferred order \u2014 the platform handles the asking.",

    speedTitle: "From posting to team in under a minute",
    speedBody:
      "Describe your activity in 30 seconds. Mesh extracts the structure and immediately starts finding or inviting the right people \u2014 no back-and-forth required.",

    useCasesTitle: "Use cases",
    useCaseAcademicTitle: "Academic collaboration",
    useCaseAcademicBody:
      "Find study partners, lab mates, or research collaborators at your university.",
    useCaseHackathonTitle: "Hackathons",
    useCaseHackathonBody:
      "Assemble a balanced team with the right skills before the event starts.",
    useCaseProfessionalTitle: "Professional & mentorship",
    useCaseProfessionalBody:
      "Find a co-founder, an advisor, or someone to pair-program with.",
    useCaseHobbiesTitle: "Hobbies & sports",
    useCaseHobbiesBody:
      "Find a tennis partner, a band member, or someone to train with.",
    useCaseSpontaneousTitle: "Spontaneous activities",
    useCaseSpontaneousBody:
      "Concert tonight? Road trip this weekend? Find someone who\u2019s in.",

    ctaTitle: "Ready to skip the back-and-forth?",
    ctaBody: "Post your activity. It takes 30 seconds.",
    ctaButton: "Get started free",
  },

  // ---------------------------------------------------------------------------
  // Site metadata / SEO
  // ---------------------------------------------------------------------------
  meta: {
    title: "Mesh \u2014 Activity Coordination Without the Back-and-Forth",
    description:
      "Stop coordinating through endless messages. Post your activity \u2014 a hackathon, a study group, a side project \u2014 and Mesh finds the right people.",
    appName: "Mesh",
  },

  // ---------------------------------------------------------------------------
  // Posting creation page
  // ---------------------------------------------------------------------------
  postingCreation: {
    pageTitle: "Create Posting",
    subtitle: "Describe your activity to find the right people",
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

    // Text-first posting
    textPlaceholder: "What are you looking for?\nType / for commands",
    errorEmptyPosting: "Please write a description before posting.",
    postButton: "Post",
    editDetailsToggle: "Edit details manually",
    editDetailsHint:
      "Fine-tune category, skills, team size, and other settings.",
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
  // Extraction review (post-creation review card)
  // ---------------------------------------------------------------------------
  extractionReview: {
    title: "Extracted Details",
    accept: "Accept",
    applied: "AI filled in some details",
    undo: "Undo",
    appliedDismiss: "Dismiss extraction summary",
    retry: "Retry",
    extracting: "Extracting details from your text...",
    error: "Failed to extract details.",
    fieldLabels: {
      category: "Category",
      skills: "Skills",
      teamSize: "Team Size",
      estimatedTime: "Time Commitment",
      tags: "Tags",
    } as const,
  },

  // ---------------------------------------------------------------------------
  // NL input panel (unified NL + form layout)
  // ---------------------------------------------------------------------------
  nlInput: {
    postingTitle: "Describe Your Posting",
    postingDescription:
      "Paste from Slack, Discord, a README, or use the mic. Details will be extracted into the form below.",
    profileTitle: "Describe Yourself",
    profileDescription:
      "Paste your GitHub README, LinkedIn bio, resume, or use the mic. Your profile fields will be populated below.",
    extractButton: "Extract",
    extractingButton: "Extracting...",
    extractedButton: "Extracted!",
    updateButton: "Update Fields",
    updatingButton: "Updating...",
    helpText:
      "Type or paste natural language and click Extract to populate the form fields below.",
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
    expiresOnHelp: "Default: 3 days from today",
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
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    saved: "Saved",
    saveChanges: "Save changes",
    loading: "Loading...",
    signIn: "Sign in",
    signOut: "Sign out",
    signUp: "Sign up",
    edit: "Edit",
    delete: "Delete",
    backToDashboard: "Back",
    backToPostings: "Back to spaces",
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
    themeLight: "Light",
    themeDark: "Dark",
    themeDusk: "Dusk",
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
    goToSpaces: "Go to spaces",
    backToLogin: "Back to login",
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
      errorDuplicateEmail: (providers: string[]) =>
        `This email is already registered via ${providers.join(", ")}. Please sign in with ${providers[0]} instead, then link your email/password in Settings.`,
    },
    callback: {
      duplicateAccountError:
        "An account already exists with this email using a different sign-in method. Please sign in with your original method, then link additional providers in Settings.",
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
    deleteAccountPlaceholder:
      "Account deletion is not yet available. Contact support if you need to delete your account.",
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
    editPosting: "Edit posting",

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
  // Owner actions (overflow menu)
  // ---------------------------------------------------------------------------
  ownerActions: {
    menuLabel: "Posting actions",
    deletePosting: "Delete Posting",
    deleteTitle: "Delete this posting?",
    deleteConfirmAction: "Delete",
  },

  // ---------------------------------------------------------------------------
  // Matched profiles
  // ---------------------------------------------------------------------------
  matchedProfiles: {
    viewProfile: "View Profile",
    message: "Message",
  },

  // ---------------------------------------------------------------------------
  // Context bar (composable access)
  // ---------------------------------------------------------------------------
  contextBar: {
    contextLabel: "Context",
    contextNone: "None",
    contextSearchPlaceholder: "Search groups...",
    inviteLabel: "Invite",
    inviteAdd: "+ Add people",
    linkLabel: "Link",
    linkCreate: "Create link",
    linkCopy: "Copy link",
    linkRevoke: "Revoke",
    linkCopied: "Link copied to clipboard",
    discoverLabel: "Show in Discover",
    summaryPrefix: "Visible to:",
    summaryEveryone: "Everyone (Discover)",
    summaryOnly: (names: string) => `Only ${names}`,
    summaryInvited: (count: number) => `${count} invited`,
    summaryPlusDiscover: (base: string) => `${base} + Everyone (Discover)`,
    summaryAnyoneWithLink: "Anyone with the link",
    summaryPlusLink: (base: string) => `${base} + anyone with link`,
    summaryMembers: (name: string, count: number) =>
      `${name} (${count} members)`,
    settingsToggle: "Settings",
    settingsHint: "size, expire, accept, N-sequential",
    teamSizeMinLabel: "Min team size",
    teamSizeMaxLabel: "Max team size",
    expiryLabel: "Expiry",
    autoAcceptLabel: "Auto-accept",
    sequentialCountLabel: "N-sequential",
  },

  // ---------------------------------------------------------------------------
  // Posting edit tab
  // ---------------------------------------------------------------------------
  postingEdit: {
    editManuallyToggle: "Edit details manually",
    editManuallyHint:
      "Use the form below to fine-tune individual fields directly.",
  },

  // ---------------------------------------------------------------------------
  // Navigation (header + sidebar)
  // ---------------------------------------------------------------------------
  nav: {
    postings: "Postings",
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
    posts: "Posts",
    bottomBar: "Tab navigation",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    clearSearch: "Clear search",
    // Spaces navigation
    spaces: "Spaces",
    activity: "Activity",
    newSpace: "New Space",
  },

  // ---------------------------------------------------------------------------
  // Spaces
  // ---------------------------------------------------------------------------
  spaces: {
    explore: "Explore",
    filterAll: "All",
    filterDMs: "DMs",
    filterGroups: "Groups",
    filterPublic: "Public",
    filterPinned: "Pinned",
    filterArchived: "Archived",
    searchSpaces: "Search spaces...",
    emptyTitle: "No spaces yet",
    emptyHint: "Browse Explore or create a new Space to get started.",
    members: (n: number) => `${n} member${n !== 1 ? "s" : ""}`,
    unread: (n: number) => `${n} unread`,
    pinned: "Pinned",
    muted: "Muted",
    stateText: "Description",
    composeMessage: "Message...",
    composePosting: "Write a posting...",
    send: "Send",
    messageMode: "Message mode",
    postingMode: "Posting mode",
    info: "Space info",
    memberList: "Members",
    spaceSettings: "Space settings",
    editStateText: "Edit description",
    searchPostings: "Search postings...",
    noPostings: "No postings yet",
    noPostingsMatch: "No postings match your search",
    joinRequest: "Request to join",
    joined: "Joined",
    typingIndicator: (names: string[]) =>
      names.length === 1
        ? `${names[0]} is typing...`
        : `${names.join(", ")} are typing...`,
    posting: {
      join: "Join",
      requestToJoin: "Request to join",
      joinConfirm: "Join this posting?",
      requestPending: "Request pending",
      submitRequest: "Submit request",
      cancel: "Cancel",
      messagePlaceholder: "Add a message (optional)...",
      close: "Close",
      filled: "Filled",
      editPosting: "Edit posting",
      deletePosting: "Delete posting",
      save: "Save",
    },
    thread: {
      replies: (n: number) => `${n} repl${n === 1 ? "y" : "ies"}`,
      viewThread: "View thread",
    },
    search: {
      toggle: "Search messages",
      placeholder: "Search messages...",
      noResults: "No messages found",
      close: "Close search",
    },
    backToSpaces: "Back",
    memberManagement: {
      admin: "Admin",
      member: "Member",
      inviteMember: "Invite member",
      searchByName: "Search by name...",
      searching: "Searching...",
      noResults: "No results found",
      remove: (name: string) => `Remove ${name}`,
    },
    postingCategory: "Category",
    postingCapacity: "Capacity",
    postingDeadline: "Deadline",
    postingVisibility: "Visibility",
    postingAutoAccept: "Auto-accept",
    postingTags: "Tags",
    postingBrowser: {
      filters: "Filters",
      sortNewest: "Newest",
      sortRelevance: "Best match",
      statusAll: "All",
      statusOpen: "Open",
      statusActive: "Active",
      statusClosed: "Closed",
      categoryAll: "All categories",
      noResults: "No postings match your filters",
      enableMatching: "Enable matching",
      enableMatchingDescription: "Run matching on postings in this Space",
    },
  },

  // ---------------------------------------------------------------------------
  // Activity
  // ---------------------------------------------------------------------------
  activity: {
    title: "Activity",
    emptyTitle: "All caught up",
    emptyHint: "No actions needed right now.",
    pendingCount: (n: number) => `${n} pending`,
    cardTypes: {
      match: "Match",
      invite: "Invite",
      scheduling: "Scheduling",
      connection_request: "Connection Request",
      rsvp: "RSVP",
      join_request: "Join Request",
    } as const,
    actions: {
      join: "Join",
      pass: "Pass",
      accept: "Accept",
      decline: "Decline",
      confirm: "Confirm",
      dismiss: "Dismiss",
    } as const,
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
    concurrentLabel: "Ask at once",
    concurrentHelp: "Number of people to invite simultaneously",
    concurrentWaitingSummary: (pending: number, total: number) =>
      `Waiting on ${pending} of ${total} connections`,
    modeInfoLabel: "How invite modes work",
    advancedSettings: "Advanced settings",
    pickerTitle: "Invite people",
    pickerSearch: "Search connections...",
    pickerNoConnections: "No connections yet",
    pickerNoMatches: "No matches",
    pickerSuggested: "Suggested",
    pickerDone: "Done",
    pickerInviteMore: "Invite more",
    pickerAskOrder: "Ask order (drag to reorder)",
    pickerSelected: "Selected connections",
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
    screenshotLabel: "Screenshots",
    screenshotAdd: "Tap, paste, or drop an image",
    screenshotAddMore: "Add another image",
    screenshotUploading: "Uploading...",
    screenshotRemove: "Remove",
    screenshotError: "Failed to upload screenshot. Please try again.",
    screenshotLimitReached: "Maximum 5 screenshots allowed",
    debugContextLabel: "Debug info attached automatically",
  },

  // ---------------------------------------------------------------------------
  // Quick Update (free-form AI update card)
  // ---------------------------------------------------------------------------
  quickUpdate: {
    profile: {
      title: "Quick Update",
      description:
        "Describe what changed and your profile fields will update automatically.",
      sourceLabel: "Your current description",
      sourceHint: "Edit this if you want to update your base description too.",
      sourcePlaceholder:
        "Paste or type your profile description here (e.g., a short bio, your skills, what you\u2019re looking for)...",
      instructionLabel: "Tell the AI what to change",
      instructionPlaceholder:
        "e.g. Make it sound more professional and highlight my Python experience",
    },
    posting: {
      title: "Quick Update",
      description:
        "Describe what changed and your posting fields will update automatically.",
      sourceLabel: "Your current description",
      sourceHint: "Edit this if you want to update your base description too.",
      sourcePlaceholder: "Paste or type your posting description here...",
      instructionLabel: "Tell the AI what to change",
      instructionPlaceholder:
        "e.g. Emphasize that we need a backend developer with Python experience",
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
    deleteAvailabilityBlock: "Delete availability block",
    previousDays: "Previous days",
    nextDays: "Next days",
    shortcuts: {
      openSearch: "Open search / command palette",
      showHelp: "Show keyboard shortcuts",
      escape: "Close dialog or panel",
      arrowKeys: "Navigate within lists",
      enter: "Select or activate",
      tab: "Move between sections",
    },
  },

  // ---------------------------------------------------------------------------
  // Command palette (global search actions)
  // ---------------------------------------------------------------------------
  commandPalette: {
    actionsHeading: "Quick Actions",
    goToSpaces: "Go to Spaces",
    goToSpacesDesc: "Browse and find spaces and postings",
    goToActivity: "Go to Activity",
    goToActivityDesc: "View notifications and updates",
    goToProfile: "Go to Profile",
    goToProfileDesc: "View and edit your profile",
    goToSettings: "Go to Settings",
    goToSettingsDesc: "App preferences and account",
    toggleTheme: "Toggle Theme",
    toggleThemeDesc: "Switch between light, dark, and dusk",
    keyboardShortcuts: "Keyboard Shortcuts",
    keyboardShortcutsTitle: "Keyboard Shortcuts",
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
    noResultsTitle: "No postings found",
    noResultsDescription: "Try a different search or adjust your filters.",
    noSavedTitle: "No saved postings",
    noSavedDescription:
      "Bookmark postings you're interested in to find them here later.",
    connectionsFilter: "Connections",
    showBreakdown: "Show breakdown",
    hideBreakdown: "Hide breakdown",
  },

  // ---------------------------------------------------------------------------
  // My Postings page
  // ---------------------------------------------------------------------------
  myPostings: {
    title: "My Postings",
    subtitle: "Manage your postings and track join requests",
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
    youApplied: "Requested",
    youInvited: "Invited",
    empty: "No active postings yet",
    emptyDescription:
      "Postings appear here once the minimum team size is reached.",
    discoverCta: "Discover postings",
    unreadMessages: (n: number) => `${n} unread message${n !== 1 ? "s" : ""}`,
  },

  // ---------------------------------------------------------------------------
  // Posts page (unified postings hub)
  // ---------------------------------------------------------------------------
  posts: {
    title: "Posts",
    subtitle: "Your postings and active projects",
    filters: {
      all: "All",
      created: "Created",
      joined: "Joined",
      applied: "Requested",
      invited: "Invited",
      completed: "Completed",
    } as const,
    empty: {
      all: "No posts yet",
      created: "You haven\u2019t created any postings yet.",
      joined: "You haven\u2019t joined any postings yet.",
      applied: "No pending join requests.",
      invited: "No pending invites.",
      completed: "No completed postings yet.",
    } as const,
    emptyDescription: {
      all: "Create a posting or browse the discover page to get started.",
      created: "Create a new posting to find collaborators.",
      joined: "Browse the discover page to find postings to join.",
      applied: "Request to join postings you\u2019re interested in.",
      invited: "Invites from connections will appear here.",
      completed: "Completed projects will appear here.",
    } as const,
    newPosting: "New Posting",
    discoverCta: "Discover postings",
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
    icalSectionTitle: "Other calendars (iCal feed)",
    icalPlaceholder: "Paste your calendar subscription URL",
    icalSubmit: "Add Feed",
    icalAdding: "Adding...",
    icalGuideToggle: "Where do I find this URL?",
    icalGuideAppleName: "Apple / iCloud",
    icalGuideAppleSteps: [
      "Open the Calendar app",
      "Right-click a calendar and choose Share Calendar",
      "Enable Public Calendar and copy the link",
    ] as string[],
    icalGuideOutlookName: "Outlook",
    icalGuideOutlookSteps: [
      "Go to Settings \u2192 Calendar \u2192 Shared calendars",
      "Under Publish a calendar, select a calendar",
      "Click Publish and copy the ICS link",
    ] as string[],
    icalGuideNextcloudName: "Nextcloud",
    icalGuideNextcloudSteps: [
      "Open the Calendar app",
      "Click the three-dot menu next to your calendar",
      "Choose Copy subscription link",
    ] as string[],
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
      "Please enter a valid iCal URL (must start with http://, https://, or webcal://).",
  },

  // ---------------------------------------------------------------------------
  // Slash commands
  // ---------------------------------------------------------------------------
  slashCommands: {
    /** Displayed when no commands match the query */
    noResults: "No commands found",
    /** Command names and descriptions (used by registry + menu) */
    time: { label: "Time", description: "Insert a time window" },
    location: { label: "Location", description: "Insert a location" },
    skills: { label: "Skills", description: "Insert required skills" },
    template: { label: "Template", description: "Apply a posting template" },
    hidden: { label: "Hidden", description: "Insert hidden details block" },
    question: {
      label: "Question",
      description: "Ask a question on acceptance",
    },
    size: { label: "Size", description: "Insert team size" },
    visibility: {
      label: "Visibility",
      description: "Set who can see this posting",
    },
    expire: { label: "Expire", description: "Set when this posting expires" },
    autoaccept: {
      label: "Auto-accept",
      description: "Auto-accept join requests",
    },
    invite: {
      label: "Invite",
      description: "Invite connections to this posting",
    },
    format: { label: "Format", description: "Auto-format with markdown" },
    clean: { label: "Clean", description: "Fix grammar and spelling" },
    availability: {
      label: "Availability",
      description: "Edit your availability windows",
    },
    calendar: {
      label: "Calendar",
      description: "Connect or manage your calendar",
    },
    update: {
      label: "Update",
      description: "Describe a change in natural language",
    },
    // Setting applied toasts
    settingApplied: {
      visibility: (v: string) => `Visibility set to ${v}`,
      expire: (v: string) => `Expiry set to ${v}`,
      autoaccept: (v: string) => `Auto-accept ${v}`,
    },
    // Time picker overlay
    timePickerTitle: "When are you available?",
    dayLabels: {
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
      sun: "Sun",
      weekdays: "Weekdays",
      weekends: "Weekends",
    } as const,
    timeOfDay: {
      morning: "Morning (6am\u201312pm)",
      afternoon: "Afternoon (12\u20135pm)",
      evening: "Evening (5\u201310pm)",
    } as const,
    customTimeLabel: "Custom time range",
    insertButton: "Insert",
    cancelButton: "Cancel",
    // Location overlay
    locationTitle: "Where?",
    locationPlaceholder: "e.g., Berlin, Germany or Remote",
    // Skills overlay
    skillsTitle: "What skills are needed?",
    skillsPlaceholder: "e.g., React, Python, Machine Learning",
    skillsPrefix: "Skills:",
    skillsMinLevel: (name: string, level: number) =>
      `${name} (min: ${level}/10)`,
    skillsAnyLevel: (name: string) => `${name} (any level)`,
    // Template overlay
    templateTitle: "Choose a template",
    templates: {
      studyGroup: "Study Group",
      hackathonTeam: "Hackathon Team",
      sideProject: "Side Project",
      mentorship: "Mentorship",
      social: "Social Activity",
    } as const,
  },

  // ---------------------------------------------------------------------------
  // Profile editor (redesigned)
  // ---------------------------------------------------------------------------
  profileEditor: {
    placeholder:
      "Describe yourself — your skills, interests, what you're looking for.\nType / for commands",
    saveButton: "Save",
    saving: "Saving...",
    saved: "Profile saved",
    availabilityTitle: "Availability & Calendar",
    updateOverlayTitle: "Describe your change",
    updateOverlayPlaceholder:
      "e.g. Add Python to my skills and mention I'm available on weekends",
    updateOverlayApply: "Apply",
    updateOverlayApplying: "Applying...",
    calendarOverlayTitle: "Calendar",
    availabilityOverlayTitle: "Availability",
  },

  // ---------------------------------------------------------------------------
  // Mobile command sheet
  // ---------------------------------------------------------------------------
  mobileCommandSheet: {
    title: "Commands",
    triggerLabel: "Open commands",
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

  // ---------------------------------------------------------------------------
  // Profile text-first
  // ---------------------------------------------------------------------------
  profileTextFirst: {
    textPlaceholder:
      "I'm a backend developer with 3 years of Python experience, looking to learn React and find project partners...",
    saveButton: "Save Profile",
    savingButton: "Saving...",
    editDetailsToggle: "Edit details manually",
    editDetailsHint: "Fine-tune individual fields",
    extractionReviewTitle: "We extracted these details from your text",
    extractionReviewDescription:
      "Review and accept the fields below, or dismiss to keep your current profile.",
    acceptAll: "Accept All",
    dismiss: "Dismiss",
    retry: "Retry",
    errorExtraction: "Failed to extract profile details. Try again?",
  },

  // ---------------------------------------------------------------------------
  // Guided prompts (new user onboarding)
  // ---------------------------------------------------------------------------
  guidedPrompts: {
    title: "Let's build your profile",
    subtitle: "Answer a few questions and we'll create your profile for you.",
    step1Question: "What are you good at?",
    step1Placeholder:
      "e.g., I've been doing Python backend development for 3 years, comfortable with Django and FastAPI...",
    step2Question: "What do you want to learn or work on?",
    step2Placeholder:
      "e.g., I want to learn React and build full-stack apps. Also interested in AI/ML projects...",
    step3Question: "Describe a recent project or collaboration",
    step3Placeholder:
      "e.g., Last month I built a REST API for a student hackathon project with two friends...",
    nextButton: "Next",
    backButton: "Back",
    reviewButton: "Review",
    reviewTitle: "Here's your profile draft",
    reviewDescription: "Edit anything you'd like, then save.",
    saveButton: "Save Profile",
    skipButton: "Skip for now",
    stepIndicator: (current: number, total: number) => `${current} of ${total}`,
    aboutMeHeading: "About Me",
    interestsHeading: "Interests & Goals",
    projectsHeading: "Recent Projects",
  },

  // ---------------------------------------------------------------------------
  // Markdown toolbar (mobile)
  // ---------------------------------------------------------------------------
  markdownToolbar: {
    slashCommand: "/",
    heading: "#",
    bold: "B",
    list: "-",
    code: "`",
    slashTooltip: "Slash command",
    headingTooltip: "Heading",
    boldTooltip: "Bold",
    listTooltip: "List item",
    codeTooltip: "Code",
  },

  // ---------------------------------------------------------------------------
  // Skill gap prompt
  // ---------------------------------------------------------------------------
  skillGap: {
    title: (skills: string[]) => {
      if (skills.length === 1)
        return `This posting needs **${skills[0]}** experience`;
      if (skills.length === 2)
        return `This posting needs **${skills[0]}** and **${skills[1]}** experience`;
      return `This posting needs **${skills[0]}**, **${skills[1]}**, and ${skills.length - 2} more skill${skills.length - 2 !== 1 ? "s" : ""}`;
    },
    description: "Describe your experience to improve your match.",
    placeholder:
      "e.g., I've been learning Machine Learning through online courses and built a simple image classifier...",
    addToProfile: "Add to Profile",
    adding: "Adding...",
    success: "Skills added to your profile!",
    dismissAriaLabel: "Dismiss skill gap prompt",
  },

  // ---------------------------------------------------------------------------
  // Text tools (auto-format, auto-clean)
  // ---------------------------------------------------------------------------
  textTools: {
    formatButton: "Auto-format",
    formatTooltip: "Add markdown structure (headings, bullets, bold)",
    cleanButton: "Auto-clean",
    cleanTooltip: "Fix grammar, spelling, and punctuation",
    formatting: "Formatting...",
    cleaning: "Cleaning...",
    errorFormat: "Failed to format text. Please try again.",
    errorClean: "Failed to clean text. Please try again.",
    noChanges: "No changes needed — your text looks good!",
    undoButton: "Undo",
    appliedFormat: "Formatted!",
    appliedClean: "Cleaned!",
  },

  // ---------------------------------------------------------------------------
  // Suggestion chips
  // ---------------------------------------------------------------------------
  suggestions: {
    time: {
      weekdayEvenings: "weekday evenings",
      flexibleSchedule: "flexible schedule",
      weekendsOnly: "weekends only",
      fewHoursPerWeek: "a few hours per week",
    } as const,
    location: {
      remote: "remote",
      inPerson: "in-person",
      flexibleLocation: "flexible location",
    } as const,
    teamSize: {
      onePerson: "looking for 1 person",
      smallTeam: "small team (2-3)",
      openSize: "open to any size",
    } as const,
    level: {
      beginnerFriendly: "beginner-friendly",
      intermediate: "intermediate level",
      anyExperience: "any experience level",
    } as const,
    dismissAriaLabel: "Dismiss suggestions",
  },

  // ---------------------------------------------------------------------------
  // Post-write nudges
  // ---------------------------------------------------------------------------
  nudges: {
    timeMessage: "You haven\u2019t mentioned when \u2014 add timing?",
    locationMessage: "No location mentioned \u2014 add where?",
    skillsMessage: "Consider mentioning specific skills needed.",
    teamSizeMessage: "How many people are you looking for?",
    levelMessage: "What experience level works best?",
    dismissAriaLabel: "Dismiss nudge",
  },

  // ---------------------------------------------------------------------------
  // Toast notifications
  // ---------------------------------------------------------------------------
  toasts: {
    // Bookmarks
    bookmarkAdded: "Posting saved",
    bookmarkRemoved: "Posting unsaved",
    bookmarkError: "Could not update bookmark",
    // Profile
    profileSaved: "Profile saved",
    profileSaveError: "Could not save profile",
    // Applications
    applicationSubmitted: "Request submitted",
    applicationWithdrawn: "Request withdrawn",
    applicationAccepted: "Request accepted",
    applicationRejected: "Request declined",
    applicationError: "Could not process request",
    // Postings
    postingCreated: "Posting created",
    postingUpdated: "Posting updated",
    postingDeleted: "Posting deleted",
    postingError: "Could not update posting",
    postingReposted: "Posting reposted",
    postingExtended: "Deadline extended",
    // Connections
    connectionSent: "Connection request sent",
    connectionAccepted: "Connection accepted",
    connectionDeclined: "Connection declined",
    connectionError: "Could not update connection",
    // Matches
    matchAccepted: "Match accepted",
    matchDeclined: "Match declined",
    matchError: "Could not update match",
    // General
    genericError: "Something went wrong",
    copied: "Copied to clipboard",
  },

  // ---------------------------------------------------------------------------
  // Tier / Premium
  // ---------------------------------------------------------------------------
  tier: {
    upgradePrompt: "Upgrade to see why you matched",
    premiumBadge: "Premium",
    freeBadge: "Free",
  },

  // ---------------------------------------------------------------------------
  // Deep Match / Explanations
  // ---------------------------------------------------------------------------
  deepMatch: {
    explanation: "Why you matched",
    concerns: "Things to consider",
    role: "Best matching role",
    generating: "Analyzing match...",
    unavailable: "Deep analysis unavailable",
    requestExplanation: "Get AI explanation",
  },

  // ---------------------------------------------------------------------------
  // Distance
  // ---------------------------------------------------------------------------
  distance: {
    away: (km: number) => `~${km} km away`,
  },

  // ---------------------------------------------------------------------------
  // Acceptance Card (Smart Join)
  // ---------------------------------------------------------------------------
  acceptanceCard: {
    loading: "Preparing your join form...",
    title: "A few quick things before you join:",
    confirmJoin: "Confirm & Join",
    confirming: "Joining...",
    scheduledFor: "Scheduled for",
    worksForMe: "This works for me",
    whenWorks: "When works for you?",
    selectAllThatWork: "Select all times that work",
    whichRole: "What role are you interested in?",
    selectOption: "Select an option",
    typeAnswer: "Type your answer...",
    yes: "Yes",
    no: "No",
    dialogTitle: "Join this posting",
    dialogDescription: "Review details and confirm joining",
  },

  // ---------------------------------------------------------------------------
  // Coordination (nested postings)
  // ---------------------------------------------------------------------------
  coordination: {
    composePlaceholder: "Propose a meeting, assign a task...",
    postButton: "Post",
    expandLink: "Full editor",
    postSuccess: "Posted to group",
    sectionTitle: "Coordination",
    emptyState: "No coordination posts yet",
    activities: (n: number) => `${n} ${n === 1 ? "activity" : "activities"}`,
    inParent: (title: string) => `in ${title}`,
    scopedDiscoverTitle: (parentTitle: string) => `Discover in ${parentTitle}`,
    browsePostings: "Browse postings",
    backToGroup: "Back to group",
  },

  // ---------------------------------------------------------------------------
  // Team card
  // ---------------------------------------------------------------------------
  teamCard: {
    title: "Team Members",
    owner: "Owner",
    emptyState: "No members have joined yet.",
  },

  // ---------------------------------------------------------------------------
  // Profile extraction review
  // ---------------------------------------------------------------------------
  extractionReviewFields: {
    fullName: "Full Name",
    headline: "Headline",
    skills: "Skills",
    location: "Location",
    languages: "Languages",
    bio: "Bio",
  },

  // ---------------------------------------------------------------------------
  // Match breakdown
  // ---------------------------------------------------------------------------
  matchBreakdown: {
    title: "Match Breakdown",
  },

  // ---------------------------------------------------------------------------
  // Interest received card
  // ---------------------------------------------------------------------------
  interestReceived: {
    interested: "Interested",
    viewPosting: "View Posting",
  },

  // ---------------------------------------------------------------------------
  // Interest sent card
  // ---------------------------------------------------------------------------
  interestSent: {
    viewDetails: "View Details",
  },

  // ---------------------------------------------------------------------------
  // AI match card
  // ---------------------------------------------------------------------------
  aiMatchCard: {
    requestToJoin: "Request to join",
    requestSent: "Request sent",
    messageTeam: "Message Team",
  },

  // ---------------------------------------------------------------------------
  // Posting card (unified)
  // ---------------------------------------------------------------------------
  postingCard: {
    moreDetails: "More details",
    lessDetails: "Less details",
    postedByYou: "Posted by you",
    postedBy: "Posted by",
    lookingFor: (n: number) =>
      `Looking for ${n} ${n === 1 ? "person" : "people"}`,
    lookingForShort: (n: number) => `${n} ${n === 1 ? "person" : "people"}`,
  },
} as const;
