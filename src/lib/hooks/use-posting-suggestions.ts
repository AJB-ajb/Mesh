import { useMemo } from "react";
import { labels } from "@/lib/labels";

export interface SuggestionChip {
  id: string;
  label: string;
  insertText: string;
}

const MAX_CHIPS = 6;

/**
 * Case-insensitive regex test with word boundaries where reasonable.
 * Some patterns (like "am/pm times") use looser matching.
 */
function hasMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

const TIME_PATTERNS = [
  /\bevening(?:s)?\b/i,
  /\bmorning(?:s)?\b/i,
  /\bweekday(?:s)?\b/i,
  /\bweekend(?:s)?\b/i,
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b\d{1,2}\s*(?:am|pm)\b/i,
  /\bflexible\s+schedule\b/i,
  /\bhours?\s*(?:\/|per)\s*week\b/i,
  /\bafternoon(?:s)?\b/i,
  /\bnight(?:s)?\b/i,
];

const LOCATION_PATTERNS = [
  /\bremote\b/i,
  /\bonline\b/i,
  /\bin[- ]person\b/i,
  /\bon[- ]site\b/i,
  /\bhybrid\b/i,
  /\banywhere\b/i,
  /\b(?:berlin|munich|hamburg|nyc|new\s+york|london|paris|san\s+francisco|los\s+angeles|tokyo|sydney)\b/i,
  /\bflexible\s+location\b/i,
];

const TEAM_SIZE_PATTERNS = [
  /\blooking\s+for\s+\d+/i,
  /\b\d+\s+people\b/i,
  /\bteam\s+of\s+\d+/i,
  /\bsolo\b/i,
  /\bpartner\b/i,
  /\bgroup\b/i,
  /\bsmall\s+team\b/i,
  /\bopen\s+to\s+any\s+size\b/i,
  /\b\d+[-–]\d+\s+(?:people|members|persons)\b/i,
];

const LEVEL_PATTERNS = [
  /\bbeginner\b/i,
  /\bintermediate\b/i,
  /\badvanced\b/i,
  /\bexpert\b/i,
  /\bany\s+experience\b/i,
  /\bno\s+experience\s+needed\b/i,
  /\bsenior\b/i,
  /\bjunior\b/i,
  /\bbeginner[- ]friendly\b/i,
  /\ball\s+levels?\b/i,
  /\bany\s+level\b/i,
];

function getTimeChips(): SuggestionChip[] {
  const s = labels.suggestions.time;
  return [
    {
      id: "time-weekday-evenings",
      label: s.weekdayEvenings,
      insertText: s.weekdayEvenings,
    },
    {
      id: "time-flexible-schedule",
      label: s.flexibleSchedule,
      insertText: s.flexibleSchedule,
    },
    {
      id: "time-weekends-only",
      label: s.weekendsOnly,
      insertText: s.weekendsOnly,
    },
    {
      id: "time-few-hours",
      label: s.fewHoursPerWeek,
      insertText: s.fewHoursPerWeek,
    },
  ];
}

function getLocationChips(): SuggestionChip[] {
  const s = labels.suggestions.location;
  return [
    { id: "location-remote", label: s.remote, insertText: s.remote },
    { id: "location-in-person", label: s.inPerson, insertText: s.inPerson },
    {
      id: "location-flexible",
      label: s.flexibleLocation,
      insertText: s.flexibleLocation,
    },
  ];
}

function getTeamSizeChips(): SuggestionChip[] {
  const s = labels.suggestions.teamSize;
  return [
    { id: "team-one-person", label: s.onePerson, insertText: s.onePerson },
    { id: "team-small", label: s.smallTeam, insertText: s.smallTeam },
    { id: "team-open-size", label: s.openSize, insertText: s.openSize },
  ];
}

function getLevelChips(): SuggestionChip[] {
  const s = labels.suggestions.level;
  return [
    {
      id: "level-beginner",
      label: s.beginnerFriendly,
      insertText: s.beginnerFriendly,
    },
    {
      id: "level-intermediate",
      label: s.intermediate,
      insertText: s.intermediate,
    },
    {
      id: "level-any-experience",
      label: s.anyExperience,
      insertText: s.anyExperience,
    },
  ];
}

/**
 * Rule-based suggestion engine that analyzes current textarea text
 * for missing posting dimensions and returns relevant chip suggestions.
 */
export function usePostingSuggestions(text: string): {
  chips: SuggestionChip[];
} {
  const chips = useMemo(() => {
    const candidates: SuggestionChip[] = [];

    if (!hasMatch(text, TIME_PATTERNS)) {
      candidates.push(...getTimeChips());
    }
    if (!hasMatch(text, LOCATION_PATTERNS)) {
      candidates.push(...getLocationChips());
    }
    if (!hasMatch(text, TEAM_SIZE_PATTERNS)) {
      candidates.push(...getTeamSizeChips());
    }
    if (!hasMatch(text, LEVEL_PATTERNS)) {
      candidates.push(...getLevelChips());
    }

    // Return max MAX_CHIPS chips, mixing from different dimensions
    return candidates.slice(0, MAX_CHIPS);
  }, [text]);

  return { chips };
}
