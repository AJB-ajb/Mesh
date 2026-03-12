/**
 * TypeScript types for Supabase database tables
 * These types match the database schema defined in migrations
 *
 * See docs/data-model.md for full schema documentation
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Typed alias for Profile.availability_slots — { "mon": ["morning", "afternoon"] } */
export type AvailabilitySlotsMap = Record<string, string[]>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      postings: {
        Row: Posting;
        Insert: PostingInsert;
        Update: PostingUpdate;
      };
      matches: {
        Row: Match;
        Insert: MatchInsert;
        Update: MatchUpdate;
      };
      friend_asks: {
        Row: FriendAsk;
        Insert: FriendAskInsert;
        Update: Partial<FriendAskInsert>;
      };
      friendships: {
        Row: Friendship;
        Insert: FriendshipInsert;
        Update: Partial<FriendshipInsert>;
      };
      feedback: {
        Row: Feedback;
        Insert: FeedbackInsert;
      };
    };
  };
}

// ============================================
// PROFILE TYPES
// ============================================

export interface Profile {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  // Location fields
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  // Skills and matching
  interests: string[] | null;
  languages: string[] | null;
  location_preference: number | null; // 0-1 float (0=in-person, 0.5=either, 1=remote)
  location_mode: "remote" | "in_person" | "either" | null;
  availability_slots: AvailabilitySlotsMap | null;
  timezone: string | null;
  // Links
  portfolio_url: string | null;
  github_url: string | null;
  // Free-form source text and undo
  source_text: string | null;
  previous_source_text: string | null;
  previous_profile_snapshot: Json | null;
  // Matching
  embedding: number[] | null;
  // Notification preferences
  notification_preferences: Json | null;
  // Tier
  tier: "free" | "premium";
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  user_id: string;
  full_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  interests?: string[] | null;
  languages?: string[] | null;
  location_preference?: number | null;
  location_mode?: "remote" | "in_person" | "either" | null;
  availability_slots?: AvailabilitySlotsMap | null;
  timezone?: string | null;
  portfolio_url?: string | null;
  github_url?: string | null;
  source_text?: string | null;
  previous_source_text?: string | null;
  previous_profile_snapshot?: Json | null;
  embedding?: number[] | null;
  notification_preferences?: Json | null;
  tier?: "free" | "premium";
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  user_id?: string;
  full_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  interests?: string[] | null;
  languages?: string[] | null;
  location_preference?: number | null;
  location_mode?: "remote" | "in_person" | "either" | null;
  availability_slots?: AvailabilitySlotsMap | null;
  timezone?: string | null;
  portfolio_url?: string | null;
  github_url?: string | null;
  source_text?: string | null;
  previous_source_text?: string | null;
  previous_profile_snapshot?: Json | null;
  embedding?: number[] | null;
  notification_preferences?: Json | null;
  tier?: "free" | "premium";
  created_at?: string;
  updated_at?: string;
}

// ============================================
// POSTING TYPES
// ============================================

export interface Posting {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category:
    | "study"
    | "hackathon"
    | "personal"
    | "professional"
    | "social"
    | null;
  context_identifier: string | null;
  tags: string[];
  team_size_min: number;
  team_size_max: number;
  mode: "open" | "friend_ask";
  /** New visibility column — replaces mode. Read this; write both during expand phase. */
  visibility: "public" | "private";
  location_preference: number | null; // 0-1 float (0=in-person, 0.5=either, 1=remote)
  natural_language_criteria: string | null;
  estimated_time: string | null;
  auto_accept: boolean;
  embedding: number[] | null;
  availability_mode: "flexible" | "recurring" | "specific_dates";
  timezone: string | null;
  status: "open" | "closed" | "filled" | "expired" | "paused";
  parent_posting_id: string | null;
  /** Composable access: appears in platform-wide Discover feed */
  in_discover: boolean;
  /** Composable access: shareable link token (null = no link) */
  link_token: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  identified_roles: string[] | null;
}

export interface PostingInsert {
  id?: string;
  creator_id: string;
  title: string;
  description: string;
  category?:
    | "study"
    | "hackathon"
    | "personal"
    | "professional"
    | "social"
    | null;
  context_identifier?: string | null;
  tags?: string[];
  team_size_min?: number;
  team_size_max?: number;
  mode?: "open" | "friend_ask";
  visibility?: "public" | "private";
  location_preference?: number | null;
  natural_language_criteria?: string | null;
  estimated_time?: string | null;
  auto_accept?: boolean;
  availability_mode?: "flexible" | "recurring" | "specific_dates";
  timezone?: string | null;
  embedding?: number[] | null;
  status?: "open" | "closed" | "filled" | "expired" | "paused";
  parent_posting_id?: string | null;
  in_discover?: boolean;
  link_token?: string | null;
  created_at?: string;
  updated_at?: string;
  expires_at: string;
  identified_roles?: string[] | null;
}

export interface PostingUpdate {
  id?: string;
  creator_id?: string;
  title?: string;
  description?: string;
  category?:
    | "study"
    | "hackathon"
    | "personal"
    | "professional"
    | "social"
    | null;
  context_identifier?: string | null;
  tags?: string[];
  team_size_min?: number;
  team_size_max?: number;
  mode?: "open" | "friend_ask";
  visibility?: "public" | "private";
  location_preference?: number | null;
  natural_language_criteria?: string | null;
  estimated_time?: string | null;
  auto_accept?: boolean;
  availability_mode?: "flexible" | "recurring" | "specific_dates";
  timezone?: string | null;
  embedding?: number[] | null;
  status?: "open" | "closed" | "filled" | "expired" | "paused";
  parent_posting_id?: string | null;
  in_discover?: boolean;
  link_token?: string | null;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  identified_roles?: string[] | null;
}

// ============================================
// MATCH TYPES
// ============================================

export interface ScoreBreakdown {
  semantic: number | null; // pgvector cosine similarity (0-1), null if embeddings missing
  availability: number | null; // time slot overlap fraction (0-1), null if data missing
  skill_level: number | null; // 1 - |levelA - levelB| / 10 (0-1), null if data missing
  location: number | null; // 1 - |prefA - prefB| (0-1), null if data missing
}

export interface Match {
  id: string;
  posting_id: string;
  user_id: string;
  similarity_score: number;
  explanation: string | null;
  score_breakdown: ScoreBreakdown | null;
  status: "pending" | "applied" | "accepted" | "declined" | "interested";
  created_at: string;
  responded_at: string | null;
  updated_at: string;
  // Deep match (LLM-enhanced) fields
  deep_match_score: number | null;
  deep_match_explanation: string | null;
  deep_match_concerns: string | null;
  deep_match_role: string | null;
  deep_matched_at: string | null;
}

export interface MatchInsert {
  id?: string;
  posting_id: string;
  user_id: string;
  similarity_score: number;
  explanation?: string | null;
  score_breakdown?: ScoreBreakdown | null;
  status?: "pending" | "applied" | "accepted" | "declined" | "interested";
  created_at?: string;
  responded_at?: string | null;
  updated_at?: string;
  deep_match_score?: number | null;
  deep_match_explanation?: string | null;
  deep_match_concerns?: string | null;
  deep_match_role?: string | null;
  deep_matched_at?: string | null;
}

export interface MatchUpdate {
  id?: string;
  posting_id?: string;
  user_id?: string;
  similarity_score?: number;
  explanation?: string | null;
  score_breakdown?: ScoreBreakdown | null;
  status?: "pending" | "applied" | "accepted" | "declined" | "interested";
  created_at?: string;
  responded_at?: string | null;
  updated_at?: string;
  deep_match_score?: number | null;
  deep_match_explanation?: string | null;
  deep_match_concerns?: string | null;
  deep_match_role?: string | null;
  deep_matched_at?: string | null;
}

// ============================================
// FRIEND ASK TYPES
// ============================================

export interface FriendAsk {
  id: string;
  posting_id: string;
  creator_id: string;
  ordered_friend_list: string[];
  current_request_index: number;
  invite_mode: "sequential" | "parallel";
  declined_list: string[];
  concurrent_invites: number;
  pending_invitees: string[];
  status: "pending" | "accepted" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface FriendAskInsert {
  id?: string;
  posting_id: string;
  creator_id: string;
  ordered_friend_list: string[];
  current_request_index?: number;
  invite_mode?: "sequential" | "parallel";
  declined_list?: string[];
  concurrent_invites?: number;
  pending_invitees?: string[];
  status?: "pending" | "accepted" | "completed" | "cancelled";
  created_at?: string;
  updated_at?: string;
}

// ============================================
// FRIENDSHIP TYPES
// ============================================

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  created_at: string;
}

export interface FriendshipInsert {
  id?: string;
  user_id: string;
  friend_id: string;
  status?: "pending" | "accepted" | "declined" | "blocked";
  created_at?: string;
}

// ============================================
// FEEDBACK TYPES
// ============================================

export type FeedbackMood = "frustrated" | "neutral" | "happy";

export interface FeedbackMetadata {
  viewport_width?: number;
  viewport_height?: number;
  screen_width?: number;
  screen_height?: number;
  device_pixel_ratio?: number;
  connection_type?: string;
  app_version?: string;
  platform?: string;
  dark_mode?: boolean;
}

export interface Feedback {
  id: string;
  user_id: string | null;
  message: string;
  mood: FeedbackMood | null;
  page_url: string;
  user_agent: string | null;
  screenshot_urls: string[] | null;
  metadata: FeedbackMetadata | null;
  created_at: string;
}

export interface FeedbackInsert {
  id?: string;
  user_id?: string | null;
  message: string;
  mood?: FeedbackMood | null;
  page_url: string;
  user_agent?: string | null;
  screenshot_urls?: string[] | null;
  metadata?: FeedbackMetadata | null;
  created_at?: string;
}

// ============================================
// MATCH WITH DETAILS (JOINED TYPES)
// ============================================

export interface MatchWithPosting extends Match {
  posting: Posting;
}

export interface MatchWithProfile extends Match {
  profile: Profile;
}

export interface MatchWithDetails extends Match {
  posting: Posting;
  profile: Profile;
}

// ============================================
// SPACE TYPES
// ============================================

export type SpaceVisibility = "private" | "public" | "link";

export interface SpaceSettings {
  posting_only?: boolean;
  visibility?: SpaceVisibility;
  auto_accept?: boolean;
  max_members?: number | null;
}

export interface Space {
  id: string;
  name: string | null;
  state_text: string | null;
  parent_space_id: string | null;
  source_posting_id: string | null;
  created_by: string;
  is_global: boolean;
  inherits_members: boolean;
  settings: SpaceSettings;
  created_at: string;
  updated_at: string;
}

export interface SpaceInsert {
  id?: string;
  name?: string | null;
  state_text?: string | null;
  parent_space_id?: string | null;
  source_posting_id?: string | null;
  created_by: string;
  is_global?: boolean;
  inherits_members?: boolean;
  settings?: SpaceSettings;
}

export interface SpaceUpdate {
  name?: string | null;
  state_text?: string | null;
  settings?: SpaceSettings;
  source_posting_id?: string | null;
  inherits_members?: boolean;
}

// ============================================
// SPACE MEMBER TYPES
// ============================================

export type SpaceMemberRole = "member" | "admin";

export interface SpaceMember {
  space_id: string;
  user_id: string;
  role: SpaceMemberRole;
  joined_at: string;
  visible_from: string;
  last_read_at: string;
  unread_count: number;
  muted: boolean;
  pinned: boolean;
  pin_order: number | null;
}

// ============================================
// SPACE MESSAGE TYPES
// ============================================

export type SpaceMessageType = "message" | "posting" | "system" | "card";

export interface SpaceMessage {
  id: string;
  space_id: string;
  sender_id: string | null;
  type: SpaceMessageType;
  content: string | null;
  posting_id: string | null;
  card_id: string | null;
  created_at: string;
}

export interface SpaceMessageInsert {
  space_id: string;
  sender_id?: string | null;
  type: SpaceMessageType;
  content?: string | null;
  posting_id?: string | null;
}

// ============================================
// SPACE POSTING TYPES
// ============================================

export type SpacePostingStatus =
  | "open"
  | "active"
  | "closed"
  | "filled"
  | "expired";

export interface SpacePosting {
  id: string;
  space_id: string;
  sub_space_id: string | null;
  created_by: string;
  text: string;
  category: string | null;
  tags: string[];
  capacity: number;
  team_size_min: number;
  deadline: string | null;
  activity_date: string | null;
  visibility: "public" | "private";
  auto_accept: boolean;
  status: SpacePostingStatus;
  extracted_metadata: Json;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface SpacePostingInsert {
  space_id: string;
  created_by: string;
  text: string;
  category?: string | null;
  tags?: string[];
  capacity?: number;
  team_size_min?: number;
  deadline?: string | null;
  activity_date?: string | null;
  visibility?: "public" | "private";
  auto_accept?: boolean;
  extracted_metadata?: Json;
}

export interface SpacePostingUpdate {
  text?: string;
  category?: string | null;
  tags?: string[];
  capacity?: number;
  team_size_min?: number;
  deadline?: string | null;
  activity_date?: string | null;
  visibility?: "public" | "private";
  auto_accept?: boolean;
  status?: SpacePostingStatus;
  extracted_metadata?: Json;
  sub_space_id?: string | null;
}

// ============================================
// SPACE JOIN REQUEST TYPES
// ============================================

export type JoinRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "waitlisted";

export interface SpaceJoinRequest {
  id: string;
  posting_id: string;
  user_id: string;
  status: JoinRequestStatus;
  responses: Json | null;
  waitlist_position: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// SPACE INVITE TYPES
// ============================================

export type InviteMode = "sequential" | "parallel";
export type InviteStatus = "active" | "completed" | "cancelled";

export interface SpaceInvite {
  id: string;
  posting_id: string;
  created_by: string;
  mode: InviteMode;
  ordered_list: string[];
  current_index: number;
  concurrent_max: number;
  pending: string[];
  declined: string[];
  status: InviteStatus;
  created_at: string;
  updated_at: string;
}

// ============================================
// ACTIVITY CARD TYPES
// ============================================

export type ActivityCardType =
  | "match"
  | "invite"
  | "scheduling"
  | "connection_request"
  | "rsvp"
  | "join_request";

export type ActivityCardStatus = "pending" | "acted" | "dismissed" | "expired";

export interface ActivityCard {
  id: string;
  user_id: string;
  type: ActivityCardType;
  space_id: string | null;
  posting_id: string | null;
  from_user_id: string | null;
  data: Json;
  status: ActivityCardStatus;
  created_at: string;
  acted_at: string | null;
}

// ============================================
// JOINED / ENRICHED TYPES
// ============================================

/** Space with membership info for the current user */
export interface SpaceWithMembership extends Space {
  space_members: SpaceMember[];
}

/** Space list item with last message preview */
export interface SpaceListItem extends Space {
  space_members: Pick<SpaceMember, "unread_count" | "pinned" | "muted" | "role">[];
  last_message?: Pick<SpaceMessage, "content" | "type" | "created_at" | "sender_id"> | null;
  member_count?: number;
  other_member_profile?: Pick<Profile, "full_name" | "user_id"> | null;
}

/** Space posting with creator profile */
export interface SpacePostingWithCreator extends SpacePosting {
  profiles: Pick<Profile, "full_name" | "user_id"> | null;
}

/** Activity card with related profile info */
export interface ActivityCardWithDetails extends ActivityCard {
  from_profile?: Pick<Profile, "full_name" | "user_id"> | null;
  space_posting?: Pick<SpacePosting, "text" | "category" | "tags" | "status"> | null;
}

// ============================================
// CONSTANTS
// ============================================

/** Fixed UUID for the Global Space (Explore) */
export const GLOBAL_SPACE_ID = "00000000-0000-0000-0000-000000000001";

// ============================================
// API RESPONSE TYPES
// ============================================

export interface MatchResponse {
  id: string;
  posting?: Posting;
  profile?: Profile;
  score: number;
  explanation: string | null;
  score_breakdown: ScoreBreakdown | null;
  status: Match["status"];
  created_at: string;
  // Deep match fields
  deep_match_score: number | null;
  deep_match_explanation: string | null;
  deep_match_concerns: string | null;
  deep_match_role: string | null;
}
