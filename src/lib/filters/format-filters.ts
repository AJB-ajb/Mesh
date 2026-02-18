import type { PostingFilters } from "@/lib/types/filters";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
  tr: "Turkish",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  no: "Norwegian",
  cs: "Czech",
};

export interface FilterPill {
  key: string;
  label: string;
}

/**
 * Convert a PostingFilters object into human-readable pills for display.
 */
export function filtersToFilterPills(filters: PostingFilters): FilterPill[] {
  const pills: FilterPill[] = [];

  if (filters.category) {
    pills.push({
      key: "category",
      label:
        filters.category.charAt(0).toUpperCase() + filters.category.slice(1),
    });
  }

  if (filters.mode) {
    pills.push({
      key: "mode",
      label: filters.mode === "open" ? "Open" : "Sequential Invite",
    });
  }

  if (filters.location_mode) {
    const modeLabels: Record<string, string> = {
      remote: "Remote only",
      in_person: "In-person",
      either: "Remote or in-person",
    };
    pills.push({
      key: "location_mode",
      label: modeLabels[filters.location_mode] || filters.location_mode,
    });
  }

  if (filters.location_name) {
    pills.push({
      key: "location_name",
      label: `Near ${filters.location_name}`,
    });
  }

  if (filters.max_distance_km != null) {
    pills.push({
      key: "max_distance_km",
      label: `Within ${filters.max_distance_km} km`,
    });
  }

  if (filters.skills && filters.skills.length > 0) {
    pills.push({
      key: "skills",
      label: `Skills: ${filters.skills.join(", ")}`,
    });
  }

  if (filters.languages && filters.languages.length > 0) {
    const names = filters.languages.map(
      (code) => LANGUAGE_NAMES[code] || code.toUpperCase(),
    );
    pills.push({ key: "languages", label: `Languages: ${names.join(", ")}` });
  }

  if (
    filters.hours_per_week_min != null ||
    filters.hours_per_week_max != null
  ) {
    if (
      filters.hours_per_week_min != null &&
      filters.hours_per_week_max != null
    ) {
      pills.push({
        key: "hours_per_week",
        label: `${filters.hours_per_week_min}-${filters.hours_per_week_max}h/week`,
      });
    } else if (filters.hours_per_week_min != null) {
      pills.push({
        key: "hours_per_week",
        label: `${filters.hours_per_week_min}+ h/week`,
      });
    } else {
      pills.push({
        key: "hours_per_week",
        label: `Up to ${filters.hours_per_week_max}h/week`,
      });
    }
  }

  if (filters.team_size_min != null || filters.team_size_max != null) {
    if (filters.team_size_min != null && filters.team_size_max != null) {
      if (filters.team_size_min === filters.team_size_max) {
        pills.push({
          key: "team_size",
          label: `Team of ${filters.team_size_min}`,
        });
      } else {
        pills.push({
          key: "team_size",
          label: `Team ${filters.team_size_min}-${filters.team_size_max}`,
        });
      }
    } else if (filters.team_size_min != null) {
      pills.push({
        key: "team_size",
        label: `${filters.team_size_min}+ people`,
      });
    } else {
      pills.push({
        key: "team_size",
        label: `Up to ${filters.team_size_max} people`,
      });
    }
  }

  if (filters.tags && filters.tags.length > 0) {
    pills.push({ key: "tags", label: `Tags: ${filters.tags.join(", ")}` });
  }

  return pills;
}

/**
 * Remove a single filter key from a PostingFilters object, returning a new object.
 */
export function removeFilterByKey(
  filters: PostingFilters,
  key: string,
): PostingFilters {
  const updated = { ...filters };

  switch (key) {
    case "category":
      delete updated.category;
      break;
    case "mode":
      delete updated.mode;
      break;
    case "location_mode":
      delete updated.location_mode;
      break;
    case "location_name":
      delete updated.location_name;
      break;
    case "max_distance_km":
      delete updated.max_distance_km;
      break;
    case "skills":
      delete updated.skills;
      break;
    case "languages":
      delete updated.languages;
      break;
    case "hours_per_week":
      delete updated.hours_per_week_min;
      delete updated.hours_per_week_max;
      break;
    case "team_size":
      delete updated.team_size_min;
      delete updated.team_size_max;
      break;
    case "tags":
      delete updated.tags;
      break;
  }

  return updated;
}
