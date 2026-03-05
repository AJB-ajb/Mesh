import type { SelectedPostingSkill } from "@/lib/types/skill";
import type {
  AvailabilityMode,
  RecurringWindow,
  SpecificWindow,
} from "@/lib/types/availability";

// ---------------------------------------------------------------------------
// Chip metadata — structured data for inline metadata chips
// ---------------------------------------------------------------------------

/** @deprecated Chip metadata is being replaced by mesh: link syntax in v0.6. Kept for DB compatibility. */
export interface ChipMetadataLocation {
  type: "location";
  display: string;
  data: {
    displayName: string;
    lat?: number;
    lng?: number;
  };
}

/** @deprecated Chip metadata is being replaced by mesh: link syntax in v0.6. Kept for DB compatibility. */
export interface ChipMetadataTime {
  type: "time";
  display: string;
  data: {
    days: string[];
    times: string[];
    customFrom?: string;
    customTo?: string;
  };
}

/** @deprecated Chip metadata is being replaced by mesh: link syntax in v0.6. Kept for DB compatibility. */
export interface ChipMetadataSkills {
  type: "skills";
  display: string;
  data: {
    skills: { skillId: string; name: string; levelMin: number | null }[];
  };
}

/** @deprecated Chip metadata is being replaced by mesh: link syntax in v0.6. Kept for DB compatibility. */
export type ChipMetadataEntry =
  | ChipMetadataLocation
  | ChipMetadataTime
  | ChipMetadataSkills;

/** @deprecated Chip metadata is being replaced by mesh: link syntax in v0.6. Kept for DB compatibility. */
export type ChipMetadataMap = Record<string, ChipMetadataEntry>;

export type PostingFormState = {
  title: string;
  description: string;
  skills: string;
  estimatedTime: string;
  teamSizeMin: string;
  teamSizeMax: string;
  lookingFor: string;
  category: string;
  mode: string;
  visibility: string;
  status: string;
  expiresAt: string;
  locationMode: string;
  locationName: string;
  locationLat: string;
  locationLng: string;
  maxDistanceKm: string;
  tags: string;
  contextIdentifier: string;
  parentPostingId: string;
  skillLevelMin: string;
  autoAccept: string;
  availabilityMode: AvailabilityMode;
  timezone: string;
  availabilityWindows: RecurringWindow[];
  specificWindows: SpecificWindow[];
  /** Skills selected from the skill tree (new normalized model) */
  selectedSkills: SelectedPostingSkill[];
};

// Default expiry: 3 days from now
function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

/** Extracted posting fields from AI extraction/update */
export type ExtractedPosting = {
  title?: string;
  description?: string;
  skills?: string[];
  category?: string;
  estimated_time?: string;
  team_size_min?: number;
  team_size_max?: number;
  tags?: string[];
  context_identifier?: string;
  parent_posting_id?: string;
  mode?: string;
  visibility?: string;
  invitees?: string[];
  availability_mode?: AvailabilityMode;
  availability_windows?: {
    day_of_week: number;
    start_minutes: number;
    end_minutes: number;
  }[];
  timezone?: string;
};

export type PostingUpdateResponse = {
  success: boolean;
  updatedSourceText: string;
  extractedPosting: ExtractedPosting;
};

export const defaultPostingFormState: PostingFormState = {
  title: "",
  description: "",
  skills: "",
  estimatedTime: "",
  teamSizeMin: "1",
  teamSizeMax: "5",
  lookingFor: "3",
  category: "personal",
  mode: "open",
  visibility: "public",
  status: "open",
  expiresAt: defaultExpiresAt(),
  locationMode: "either",
  locationName: "",
  locationLat: "",
  locationLng: "",
  maxDistanceKm: "",
  tags: "",
  contextIdentifier: "",
  parentPostingId: "",
  skillLevelMin: "",
  autoAccept: "false",
  availabilityMode: "flexible",
  timezone: "",
  availabilityWindows: [],
  specificWindows: [],
  selectedSkills: [],
};
