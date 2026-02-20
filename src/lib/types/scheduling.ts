// ---------------------------------------------------------------------------
// Team scheduling types (Phase 5)
// ---------------------------------------------------------------------------

export type ProposalStatus = "proposed" | "confirmed" | "cancelled";

export type MeetingResponseValue = "available" | "unavailable";

/** Database row shape for meeting_proposals */
export type MeetingProposal = {
  id: string;
  posting_id: string;
  proposed_by: string;
  title: string | null;
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  responses?: MeetingResponseRecord[];
};

/** Database row shape for meeting_responses */
export type MeetingResponseRecord = {
  id: string;
  proposal_id: string;
  responder_id: string;
  response: MeetingResponseValue;
  created_at: string;
  updated_at: string;
  /** Joined profile data (optional, populated by API) */
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  };
};

/** Return shape from get_team_common_availability() RPC */
export type CommonAvailabilityWindow = {
  day_of_week: number; // 0=Mon..6=Sun
  start_minutes: number;
  end_minutes: number;
};
