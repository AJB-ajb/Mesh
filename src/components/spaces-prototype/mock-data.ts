// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpaceType = "dm" | "small" | "large" | "global";

export type Space = {
  id: string;
  name: string;
  type: SpaceType;
  memberCount: number;
  unreadCount: number;
  pinned: boolean;
  lastMessage: string;
  lastMessageTime: string;
  online?: boolean; // for DMs
  avatarInitials: string;
  stateText?: string;
  postingOnly?: boolean;
};

export type MessageType = "regular" | "system" | "posting";
export type CardType = "time-proposal" | "rsvp" | "poll" | "posting-card";

export type TimeSlot = {
  label: string;
  votes: string[];
  total: number;
};

export type RsvpOption = "yes" | "no" | "maybe";

export type PollOption = {
  label: string;
  votes: number;
};

export type CardData = {
  type: CardType;
  // Time proposal
  slots?: TimeSlot[];
  resolved?: boolean;
  resolvedSlot?: string;
  tradeOffs?: { label: string; note: string }[];
  // RSVP
  rsvpCounts?: { yes: number; no: number; maybe: number };
  eventTime?: string;
  // Poll
  pollQuestion?: string;
  pollOptions?: PollOption[];
  // Posting card (inline in conversation or large space)
  postingTitle?: string;
  postingText?: string;
  postingTags?: string[];
  postingCapacity?: string;
  postingDeadline?: string;
  postingCreator?: string;
  postingCreatorTime?: string;
};

export type Message = {
  id: string;
  spaceId: string;
  sender: string;
  senderInitials: string;
  content: string;
  time: string;
  type: MessageType;
  isOwn: boolean;
  card?: CardData;
};

export type ActivityItemType =
  | "match"
  | "invite"
  | "scheduling"
  | "connection"
  | "rsvp";

export type ActivityItem = {
  id: string;
  type: ActivityItemType;
  title: string;
  subtitle: string;
  detail?: string;
  score?: number;
  time: string;
  spaceId?: string;
  actions: { label: string; variant: "default" | "outline" | "secondary" }[];
};

export type Profile = {
  name: string;
  initials: string;
  bio: string;
  university: string;
  skills: string[];
  connections: number;
  spaces: number;
};

// ---------------------------------------------------------------------------
// Mock Spaces (9)
// ---------------------------------------------------------------------------

export const SPACES: Space[] = [
  {
    id: "explore",
    name: "Explore",
    type: "global",
    memberCount: 1247,
    unreadCount: 0,
    pinned: true,
    lastMessage: 'New: "Coffee near Marienplatz, anyone?"',
    lastMessageTime: "12:34",
    avatarInitials: "EX",
    stateText:
      "The global discovery space. Browse and post activities visible to everyone at your university.",
    postingOnly: true,
  },
  {
    id: "lena",
    name: "Lena",
    type: "dm",
    memberCount: 2,
    unreadCount: 0,
    pinned: false,
    lastMessage: "See you Thursday!",
    lastMessageTime: "Yesterday",
    online: true,
    avatarInitials: "LK",
  },
  {
    id: "kai",
    name: "Kai",
    type: "dm",
    memberCount: 2,
    unreadCount: 0,
    pinned: false,
    lastMessage: "Thanks for the notes",
    lastMessageTime: "Mon",
    online: false,
    avatarInitials: "KM",
  },
  {
    id: "xhacks",
    name: "XHacks 2026",
    type: "large",
    memberCount: 187,
    unreadCount: 0,
    pinned: false,
    lastMessage: 'New posting: "Need UI designer for accessibility tool"',
    lastMessageTime: "2h",
    avatarInitials: "XH",
    stateText:
      "XHacks 2026 — 48-hour hackathon, March 22-24. Build something that improves accessibility on campus. Teams of 2-4. Prizes for best UX, most impactful, and crowd favorite.",
    postingOnly: true,
  },
  {
    id: "spanish",
    name: "Spanish Practice",
    type: "small",
    memberCount: 5,
    unreadCount: 0,
    pinned: false,
    lastMessage: "Marta: Can we start at 19:00 this week?",
    lastMessageTime: "3h",
    avatarInitials: "SP",
    stateText:
      "Conversational Spanish, B1-B2 level. Tuesdays 18:30 at Cafe Fruhling. Bring your own topics!",
  },
  {
    id: "data-structures",
    name: "Data Structures Project",
    type: "small",
    memberCount: 3,
    unreadCount: 4,
    pinned: true,
    lastMessage: "Priya: Assignment 3 is up!",
    lastMessageTime: "9:15",
    avatarInitials: "DS",
    stateText:
      "Data Structures group project — Prof. Weber, WS 2025/26. Weekly sync Thursdays 17:00. Current: Assignment 3 (due March 20).",
  },
  {
    id: "friday-dinner",
    name: "Friday Dinner",
    type: "small",
    memberCount: 4,
    unreadCount: 0,
    pinned: false,
    lastMessage: "Alex: Italian, central Munich, ~4 people?",
    lastMessageTime: "5h",
    avatarInitials: "FD",
    stateText:
      "Friday dinner plans — Italian food, central Munich area. Aiming for 4 people.",
  },
  {
    id: "api-call",
    name: "API Redesign Call",
    type: "small",
    memberCount: 2,
    unreadCount: 0,
    pinned: false,
    lastMessage: "Kim: 15:00 works for me",
    lastMessageTime: "Yesterday",
    avatarInitials: "AR",
    stateText: "Quick 15-min call to discuss the API redesign approach.",
  },
  {
    id: "board-games",
    name: "Board Game Night",
    type: "small",
    memberCount: 5,
    unreadCount: 0,
    pinned: false,
    lastMessage: "Alex: Bring your favorite game!",
    lastMessageTime: "Tue",
    avatarInitials: "BG",
    stateText:
      "Board game night — Saturday 19:00, Alex's place, 4-5 people. Bring your favorite game. Snacks provided.",
  },
];

// ---------------------------------------------------------------------------
// Mock Messages (per space)
// ---------------------------------------------------------------------------

export const MESSAGES: Record<string, Message[]> = {
  lena: [
    {
      id: "l1",
      spaceId: "lena",
      sender: "Lena",
      senderInitials: "LK",
      content: "Hey! Are you going to the lecture tomorrow?",
      time: "Mon 10:23",
      type: "regular",
      isOwn: false,
    },
    {
      id: "l2",
      spaceId: "lena",
      sender: "Alex",
      senderInitials: "AX",
      content: "Yeah, I'll be there. Want to grab coffee after?",
      time: "Mon 10:25",
      type: "regular",
      isOwn: true,
    },
    {
      id: "l3",
      spaceId: "lena",
      sender: "Lena",
      senderInitials: "LK",
      content: "That sounds great! Same place as last time?",
      time: "Mon 10:28",
      type: "regular",
      isOwn: false,
    },
    {
      id: "l4",
      spaceId: "lena",
      sender: "Alex",
      senderInitials: "AX",
      content:
        "Yep, the cafe near the library. They have a new matcha latte I want to try",
      time: "Mon 10:30",
      type: "regular",
      isOwn: true,
    },
    {
      id: "l5",
      spaceId: "lena",
      sender: "Lena",
      senderInitials: "LK",
      content: "See you Thursday!",
      time: "Mon 10:32",
      type: "regular",
      isOwn: false,
    },
  ],

  kai: [
    {
      id: "k1",
      spaceId: "kai",
      sender: "Alex",
      senderInitials: "AX",
      content: "Hey, can you send me the notes from today?",
      time: "Fri 14:00",
      type: "regular",
      isOwn: true,
    },
    {
      id: "k2",
      spaceId: "kai",
      sender: "Kai",
      senderInitials: "KM",
      content:
        "Sure, give me a few minutes. Prof went really fast today on the graph algorithms section",
      time: "Fri 14:15",
      type: "regular",
      isOwn: false,
    },
    {
      id: "k3",
      spaceId: "kai",
      sender: "Kai",
      senderInitials: "KM",
      content:
        "Here you go — I added some extra explanations for the Dijkstra proof part",
      time: "Fri 14:42",
      type: "regular",
      isOwn: false,
    },
    {
      id: "k4",
      spaceId: "kai",
      sender: "Alex",
      senderInitials: "AX",
      content: "Thanks for the notes",
      time: "Fri 14:45",
      type: "regular",
      isOwn: true,
    },
  ],

  spanish: [
    {
      id: "sp1",
      spaceId: "spanish",
      sender: "System",
      senderInitials: "",
      content: "Marta created this space",
      time: "2 weeks ago",
      type: "system",
      isOwn: false,
    },
    {
      id: "sp2",
      spaceId: "spanish",
      sender: "Marta",
      senderInitials: "MA",
      content:
        "Welcome everyone! Let's practice our Spanish together. I thought we could meet weekly on Tuesdays.",
      time: "2 weeks ago",
      type: "regular",
      isOwn: false,
    },
    {
      id: "sp3",
      spaceId: "spanish",
      sender: "Alex",
      senderInitials: "AX",
      content: "Sounds great! I'm B1 level, trying to get to B2 this semester.",
      time: "2 weeks ago",
      type: "regular",
      isOwn: true,
    },
    {
      id: "sp4",
      spaceId: "spanish",
      sender: "Luis",
      senderInitials: "LR",
      content: "Count me in! Native speaker here, happy to help.",
      time: "2 weeks ago",
      type: "regular",
      isOwn: false,
    },
    {
      id: "sp5",
      spaceId: "spanish",
      sender: "System",
      senderInitials: "",
      content: "Elena joined the space",
      time: "Last week",
      type: "system",
      isOwn: false,
    },
    {
      id: "sp6",
      spaceId: "spanish",
      sender: "Marta",
      senderInitials: "MA",
      content: "This Tuesday's session — who's coming?",
      time: "3h",
      type: "regular",
      isOwn: false,
    },
    {
      id: "sp7",
      spaceId: "spanish",
      sender: "System",
      senderInitials: "",
      content: "",
      time: "3h",
      type: "regular",
      isOwn: false,
      card: {
        type: "time-proposal",
        slots: [
          {
            label: "Tue 18:30 (usual)",
            votes: ["Marta", "Alex", "Luis"],
            total: 5,
          },
          { label: "Tue 19:00", votes: ["Elena"], total: 5 },
          { label: "Wed 18:30", votes: [], total: 5 },
        ],
      },
    },
    {
      id: "sp8",
      spaceId: "spanish",
      sender: "Marta",
      senderInitials: "MA",
      content: "Can we start at 19:00 this week? I have a late meeting.",
      time: "3h",
      type: "regular",
      isOwn: false,
    },
  ],

  "data-structures": [
    {
      id: "ds1",
      spaceId: "data-structures",
      sender: "System",
      senderInitials: "",
      content: "Alex created this space",
      time: "3 weeks ago",
      type: "system",
      isOwn: false,
    },
    {
      id: "ds2",
      spaceId: "data-structures",
      sender: "Alex",
      senderInitials: "AX",
      content: "Team! Let's set up our weekly sync. When works for everyone?",
      time: "3 weeks ago",
      type: "regular",
      isOwn: true,
    },
    {
      id: "ds3",
      spaceId: "data-structures",
      sender: "System",
      senderInitials: "",
      content: "",
      time: "3 weeks ago",
      type: "regular",
      isOwn: false,
      card: {
        type: "time-proposal",
        slots: [
          {
            label: "Thu 17:00",
            votes: ["Alex", "Priya", "Marco"],
            total: 3,
          },
          { label: "Fri 14:00", votes: ["Alex", "Marco"], total: 3 },
          { label: "Wed 16:00", votes: ["Priya"], total: 3 },
        ],
        resolved: true,
        resolvedSlot: "Thu 17:00",
      },
    },
    {
      id: "ds4",
      spaceId: "data-structures",
      sender: "System",
      senderInitials: "",
      content:
        "Confirmed: Weekly sync Thursdays 17:00. Calendar events created.",
      time: "3 weeks ago",
      type: "system",
      isOwn: false,
    },
    {
      id: "ds5",
      spaceId: "data-structures",
      sender: "Priya",
      senderInitials: "PG",
      content: "Assignment 3 is up! We need to implement a red-black tree.",
      time: "9:15",
      type: "regular",
      isOwn: false,
    },
    {
      id: "ds6",
      spaceId: "data-structures",
      sender: "Marco",
      senderInitials: "MR",
      content: "Working session this weekend? Library or remote?",
      time: "9:20",
      type: "regular",
      isOwn: false,
    },
    {
      id: "ds7",
      spaceId: "data-structures",
      sender: "System",
      senderInitials: "",
      content: "",
      time: "9:20",
      type: "regular",
      isOwn: false,
      card: {
        type: "rsvp",
        rsvpCounts: { yes: 2, no: 0, maybe: 1 },
        eventTime: "Saturday 14:00",
      },
    },
    {
      id: "ds8",
      spaceId: "data-structures",
      sender: "System",
      senderInitials: "",
      content: "",
      time: "9:25",
      type: "regular",
      isOwn: false,
      card: {
        type: "poll",
        pollQuestion: "Where should we work?",
        pollOptions: [
          { label: "Library (3rd floor)", votes: 2 },
          { label: "Remote (Discord)", votes: 1 },
          { label: "Cafe Fruhling", votes: 0 },
        ],
      },
    },
    {
      id: "ds9",
      spaceId: "data-structures",
      sender: "Priya",
      senderInitials: "PG",
      content:
        "I voted library — we can use the whiteboard for the tree diagrams",
      time: "9:30",
      type: "regular",
      isOwn: false,
    },
  ],

  "friday-dinner": [
    {
      id: "fd1",
      spaceId: "friday-dinner",
      sender: "Alex",
      senderInitials: "AX",
      content: "Friday dinner, Italian, central Munich, ~4 people?",
      time: "5h",
      type: "regular",
      isOwn: true,
    },
    {
      id: "fd2",
      spaceId: "friday-dinner",
      sender: "System",
      senderInitials: "",
      content: "Lena, Priya, and Kim were invited",
      time: "5h",
      type: "system",
      isOwn: false,
    },
    {
      id: "fd3",
      spaceId: "friday-dinner",
      sender: "Lena",
      senderInitials: "LK",
      content: "I'm in! But I can only do 20:00 onwards",
      time: "4h",
      type: "regular",
      isOwn: false,
    },
    {
      id: "fd4",
      spaceId: "friday-dinner",
      sender: "Priya",
      senderInitials: "PG",
      content: "My Garching meeting ends at 19:00, I'd arrive ~19:40",
      time: "4h",
      type: "regular",
      isOwn: false,
    },
    {
      id: "fd5",
      spaceId: "friday-dinner",
      sender: "System",
      senderInitials: "",
      content: "",
      time: "4h",
      type: "regular",
      isOwn: false,
      card: {
        type: "time-proposal",
        tradeOffs: [
          {
            label: "A: 19:00 — without Priya",
            note: "Priya would miss the first hour",
          },
          {
            label: "B: 20:00 — all 4",
            note: "Everyone can make it, later finish",
          },
          {
            label: "C: Saturday instead — all 4",
            note: "More relaxed, full evening",
          },
        ],
      },
    },
    {
      id: "fd6",
      spaceId: "friday-dinner",
      sender: "Kim",
      senderInitials: "KJ",
      content: "I vote option B — I'd rather have everyone there!",
      time: "3h",
      type: "regular",
      isOwn: false,
    },
  ],

  "api-call": [
    {
      id: "ac1",
      spaceId: "api-call",
      sender: "Alex",
      senderInitials: "AX",
      content: "Quick call about the API redesign? 15 min.",
      time: "Yesterday 11:00",
      type: "regular",
      isOwn: true,
    },
    {
      id: "ac2",
      spaceId: "api-call",
      sender: "System",
      senderInitials: "",
      content: "",
      time: "Yesterday 11:00",
      type: "regular",
      isOwn: false,
      card: {
        type: "time-proposal",
        slots: [
          { label: "Today 14:45", votes: ["Alex"], total: 2 },
          { label: "Today 15:00", votes: ["Alex", "Kim"], total: 2 },
          { label: "Tomorrow 10:00", votes: [], total: 2 },
        ],
        resolved: true,
        resolvedSlot: "Today 15:00",
      },
    },
    {
      id: "ac3",
      spaceId: "api-call",
      sender: "Kim",
      senderInitials: "KJ",
      content: "15:00 works for me",
      time: "Yesterday 11:30",
      type: "regular",
      isOwn: false,
    },
    {
      id: "ac4",
      spaceId: "api-call",
      sender: "System",
      senderInitials: "",
      content: "Confirmed: Today 15:00. Calendar event created.",
      time: "Yesterday 11:30",
      type: "system",
      isOwn: false,
    },
  ],

  "board-games": [
    {
      id: "bg1",
      spaceId: "board-games",
      sender: "Alex",
      senderInitials: "AX",
      content:
        "Board game night this Saturday? I can host at my place. Thinking 19:00.",
      time: "Tue 15:00",
      type: "regular",
      isOwn: true,
    },
    {
      id: "bg2",
      spaceId: "board-games",
      sender: "System",
      senderInitials: "",
      content: "",
      time: "Tue 15:00",
      type: "regular",
      isOwn: false,
      card: {
        type: "rsvp",
        rsvpCounts: { yes: 4, no: 0, maybe: 1 },
        eventTime: "Saturday 19:00",
      },
    },
    {
      id: "bg3",
      spaceId: "board-games",
      sender: "System",
      senderInitials: "",
      content: "",
      time: "Tue 15:05",
      type: "regular",
      isOwn: false,
      card: {
        type: "poll",
        pollQuestion: "Which games should we play?",
        pollOptions: [
          { label: "Catan", votes: 3 },
          { label: "Codenames", votes: 4 },
          { label: "Wingspan", votes: 2 },
          { label: "Ticket to Ride", votes: 1 },
        ],
      },
    },
    {
      id: "bg4",
      spaceId: "board-games",
      sender: "Lena",
      senderInitials: "LK",
      content: "Codenames is a must! Can I bring a friend?",
      time: "Tue 16:00",
      type: "regular",
      isOwn: false,
    },
    {
      id: "bg5",
      spaceId: "board-games",
      sender: "Alex",
      senderInitials: "AX",
      content: "Of course! The more the merrier. Bring your favorite game!",
      time: "Tue 16:05",
      type: "regular",
      isOwn: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Large Space Postings (for Explore + XHacks)
// ---------------------------------------------------------------------------

export const LARGE_SPACE_POSTINGS: Record<string, CardData[]> = {
  explore: [
    {
      type: "posting-card",
      postingTitle: "Coffee near Marienplatz",
      postingText:
        "Grabbing coffee near Marienplatz, anyone? Next hour. I know a great spot with outdoor seating.",
      postingTags: ["social", "coffee"],
      postingCapacity: "1/2",
      postingDeadline: "1h",
      postingCreator: "Lena K.",
      postingCreatorTime: "34 min ago",
    },
    {
      type: "posting-card",
      postingTitle: "Study buddy for Linear Algebra",
      postingText:
        "Looking for someone to study Linear Algebra with. Exam is in 3 weeks. I'm solid on eigenvectors but struggling with SVD.",
      postingTags: ["study", "math"],
      postingCapacity: "0/1",
      postingDeadline: "3 weeks",
      postingCreator: "Marco R.",
      postingCreatorTime: "2h ago",
    },
    {
      type: "posting-card",
      postingTitle: "Running group — morning 5k",
      postingText:
        "Starting a casual morning running group. 5k around the English Garden, 3x/week. All paces welcome.",
      postingTags: ["sports", "fitness"],
      postingCapacity: "3/8",
      postingDeadline: "Ongoing",
      postingCreator: "Elena S.",
      postingCreatorTime: "5h ago",
    },
    {
      type: "posting-card",
      postingTitle: "Need photographer for portfolio shoot",
      postingText:
        "Design student looking for a photographer for a quick portfolio shoot. Can trade graphic design work!",
      postingTags: ["creative", "photography"],
      postingCapacity: "0/1",
      postingDeadline: "This week",
      postingCreator: "Nina W.",
      postingCreatorTime: "Yesterday",
    },
  ],
  xhacks: [
    {
      type: "posting-card",
      postingTitle: "Accessibility checker — need designer + backend dev",
      postingText:
        "Building a browser extension that checks web pages for WCAG violations and suggests fixes. Need someone for the UI and someone to build the API.",
      postingTags: ["a11y", "browser-ext", "design"],
      postingCapacity: "1/3",
      postingDeadline: "Mar 22",
      postingCreator: "Alex",
      postingCreatorTime: "2h ago",
    },
    {
      type: "posting-card",
      postingTitle: "Campus navigation for wheelchair users",
      postingText:
        "Indoor navigation app showing wheelchair-accessible routes across campus buildings. Need React Native + mapping expertise.",
      postingTags: ["mobile", "maps", "a11y"],
      postingCapacity: "2/4",
      postingDeadline: "Mar 22",
      postingCreator: "Priya G.",
      postingCreatorTime: "5h ago",
    },
    {
      type: "posting-card",
      postingTitle: "Sign language learning with AI",
      postingText:
        "Real-time sign language practice tool using webcam + ML. Looking for someone experienced with MediaPipe or similar.",
      postingTags: ["AI/ML", "a11y", "education"],
      postingCapacity: "1/2",
      postingDeadline: "Mar 22",
      postingCreator: "Kim J.",
      postingCreatorTime: "8h ago",
    },
    {
      type: "posting-card",
      postingTitle: "Dyslexia-friendly document converter",
      postingText:
        "Converts PDFs and web pages into dyslexia-friendly formats (OpenDyslexic font, custom spacing, color overlays). Full-stack project.",
      postingTags: ["full-stack", "a11y", "tools"],
      postingCapacity: "0/3",
      postingDeadline: "Mar 22",
      postingCreator: "Luis R.",
      postingCreatorTime: "Yesterday",
    },
  ],
};

// ---------------------------------------------------------------------------
// Activity Items (7)
// ---------------------------------------------------------------------------

export const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: "a1",
    type: "match",
    title: "Coffee near Marienplatz",
    subtitle: "92% match — Lena K. is looking for a coffee buddy right now",
    detail:
      "You matched on: location (both near Marienplatz), free in the next hour, shared interest in design",
    score: 92,
    time: "34 min ago",
    spaceId: "explore",
    actions: [
      { label: "Join", variant: "default" },
      { label: "Pass", variant: "outline" },
    ],
  },
  {
    id: "a2",
    type: "invite",
    title: "XHacks 2026 — Team Invite",
    subtitle: 'Priya invited you to "Campus navigation for wheelchair users"',
    detail:
      "You matched as: React Native developer — your mobile experience and accessibility interest",
    time: "2h ago",
    spaceId: "xhacks",
    actions: [
      { label: "Join Team", variant: "default" },
      { label: "Decline", variant: "outline" },
    ],
  },
  {
    id: "a3",
    type: "scheduling",
    title: "Spanish Practice — Time Changed",
    subtitle: "Marta proposed 19:00 instead of 18:30 this week",
    detail:
      "Your calendar shows you're free at 19:00. The usual 18:30 slot conflicts with Marta's meeting.",
    time: "3h ago",
    spaceId: "spanish",
    actions: [
      { label: "Confirm 19:00", variant: "default" },
      { label: "Suggest Different", variant: "outline" },
    ],
  },
  {
    id: "a4",
    type: "connection",
    title: "Connection Request",
    subtitle: "Elena S. wants to connect",
    detail:
      "You're both in Spanish Practice. Elena is a B2 Spanish speaker studying Data Science.",
    time: "5h ago",
    actions: [
      { label: "Accept", variant: "default" },
      { label: "Decline", variant: "outline" },
    ],
  },
  {
    id: "a5",
    type: "rsvp",
    title: "Board Game Night — RSVP",
    subtitle: "Saturday 19:00 at Alex's place",
    detail: "4 confirmed, 1 maybe. Codenames is winning the game poll!",
    time: "Yesterday",
    spaceId: "board-games",
    actions: [
      { label: "Yes", variant: "default" },
      { label: "No", variant: "outline" },
      { label: "Maybe", variant: "secondary" },
    ],
  },
  {
    id: "a6",
    type: "match",
    title: "Study buddy for Linear Algebra",
    subtitle: "85% match — Marco R. needs help with SVD",
    detail:
      "You both have the same exam date. You scored high on SVD in your practice tests.",
    score: 85,
    time: "2h ago",
    spaceId: "explore",
    actions: [
      { label: "Join", variant: "default" },
      { label: "Pass", variant: "outline" },
    ],
  },
  {
    id: "a7",
    type: "invite",
    title: "Running Group — Join?",
    subtitle: "Elena is starting a morning running group",
    detail: "5k around the English Garden, 3x/week. 3 of 8 spots filled.",
    time: "5h ago",
    spaceId: "explore",
    actions: [
      { label: "Join", variant: "default" },
      { label: "Pass", variant: "outline" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const PROFILE: Profile = {
  name: "Alex",
  initials: "AX",
  bio: "CS student at TUM. Into web dev, accessibility, and board games. Always up for coffee and good conversation.",
  university: "Technical University of Munich",
  skills: [
    "React",
    "TypeScript",
    "Node.js",
    "Python",
    "Figma",
    "Accessibility",
  ],
  connections: 23,
  spaces: 9,
};
