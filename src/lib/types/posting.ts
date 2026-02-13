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
};

// Default expiry: 90 days from now
function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

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
};
