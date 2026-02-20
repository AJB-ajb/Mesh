export interface PostingFilters {
  category?: string;
  visibility?: "public" | "private";
  location_mode?: "remote" | "in_person" | "either";
  location_name?: string;
  max_distance_km?: number;
  skills?: string[];
  languages?: string[];
  hours_per_week_min?: number;
  hours_per_week_max?: number;
  team_size_min?: number;
  team_size_max?: number;
  tags?: string[];
}
