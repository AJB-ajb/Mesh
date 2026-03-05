// ---------------------------------------------------------------------------
// Smart Acceptance Card types (Phase 3)
// ---------------------------------------------------------------------------

export interface TimeSlot {
  start: string; // ISO 8601
  end: string;
  label: string; // "Tue 6pm"
  note?: string; // "Accounts for your commute from Garching"
}

export interface AcceptanceQuestion {
  id: string; // "q_<hash>"
  question: string;
  type: "text" | "yes_no" | "select";
  options?: string[];
  source: "poster" | "inferred";
}

export interface AcceptanceRole {
  id: string;
  name: string;
  description?: string;
}

export interface AcceptanceCardData {
  skip_time: boolean;
  time_slots: TimeSlot[];
  inferred_duration_minutes?: number;
  questions: AcceptanceQuestion[];
  roles: AcceptanceRole[];
  confirmed_time?: {
    start: string;
    end: string;
    label: string;
  } | null;
}

/** Submitted with the application */
export interface ApplicationResponses {
  questions?: Array<{
    id: string;
    question: string;
    type: string;
    answer: string;
    answered_at: string;
  }>;
  time_selection?: {
    slots: string[]; // ISO timestamps of selected slots
    duration_minutes: number;
    timezone: string;
  };
  role?: {
    id: string;
    name: string;
  };
  meta: {
    card_version: number;
    completed_at: string;
  };
}
