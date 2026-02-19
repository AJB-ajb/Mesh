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
  location_preference: number | null; // 0-1 float (0=in-person, 0.5=either, 1=remote)
  natural_language_criteria: string | null;
  estimated_time: string | null;
  auto_accept: boolean;
  embedding: number[] | null;
  availability_mode: "flexible" | "recurring" | "specific_dates";
  timezone: string | null;
  status: "open" | "closed" | "filled" | "expired" | "paused";
  created_at: string;
  updated_at: string;
  expires_at: string;
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
  location_preference?: number | null;
  natural_language_criteria?: string | null;
  estimated_time?: string | null;
  auto_accept?: boolean;
  availability_mode?: "flexible" | "recurring" | "specific_dates";
  timezone?: string | null;
  embedding?: number[] | null;
  status?: "open" | "closed" | "filled" | "expired" | "paused";
  created_at?: string;
  updated_at?: string;
  expires_at: string;
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
  location_preference?: number | null;
  natural_language_criteria?: string | null;
  estimated_time?: string | null;
  auto_accept?: boolean;
  availability_mode?: "flexible" | "recurring" | "specific_dates";
  timezone?: string | null;
  embedding?: number[] | null;
  status?: "open" | "closed" | "filled" | "expired" | "paused";
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
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

export interface Feedback {
  id: string;
  user_id: string | null;
  message: string;
  mood: FeedbackMood | null;
  page_url: string;
  user_agent: string | null;
  created_at: string;
}

export interface FeedbackInsert {
  id?: string;
  user_id?: string | null;
  message: string;
  mood?: FeedbackMood | null;
  page_url: string;
  user_agent?: string | null;
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
}
