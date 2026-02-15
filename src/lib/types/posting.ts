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
  status: string;
  expiresAt: string;
  locationMode: string;
  locationName: string;
  locationLat: string;
  locationLng: string;
  maxDistanceKm: string;
  tags: string;
  contextIdentifier: string;
  skillLevelMin: string;
  autoAccept: string;
};

// Default expiry: 90 days from now
function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

/** Extracted posting fields from AI update */
export type ExtractedPosting = {
  title?: string;
  description?: string;
  skills?: string[];
  category?: string;
  estimated_time?: string;
  team_size_min?: number;
  team_size_max?: number;
  skill_level_min?: number;
  tags?: string[];
  context_identifier?: string;
  mode?: string;
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
  status: "open",
  expiresAt: defaultExpiresAt(),
  locationMode: "either",
  locationName: "",
  locationLat: "",
  locationLng: "",
  maxDistanceKm: "",
  tags: "",
  contextIdentifier: "",
  skillLevelMin: "",
  autoAccept: "false",
};
