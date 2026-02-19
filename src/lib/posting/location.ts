/**
 * Returns a human-readable location display string.
 * Returns null for unknown/unset modes.
 */
export function getLocationDisplay(
  locationMode?: string | null,
  locationName?: string | null,
): string | null {
  switch (locationMode) {
    case "remote":
      return "Remote";
    case "in_person":
      return locationName || "In-person";
    case "either":
      return locationName || "Flexible";
    default:
      return null;
  }
}

/**
 * Returns an emoji icon for the location mode.
 * Returns null for unknown/unset modes.
 */
export function getLocationIcon(locationMode?: string | null): string | null {
  switch (locationMode) {
    case "remote":
      return "🏠";
    case "in_person":
      return "📍";
    case "either":
      return "🌐";
    default:
      return null;
  }
}

/**
 * Returns a combined label (icon + text) for the location mode.
 * Returns null for unknown/unset modes.
 * Used by discover-card style components that want a single string.
 */
export function getLocationLabel(
  locationMode: string | null,
  locationName: string | null,
): string | null {
  const icon = getLocationIcon(locationMode);
  const display = getLocationDisplay(locationMode, locationName);
  if (icon === null || display === null) return null;
  return `${icon} ${display}`;
}

/**
 * Returns an { icon, label } object for the location mode.
 * Falls back to flexible for unknown modes.
 * Used by about-card style components.
 */
export function getLocationModeDisplay(mode: string | null): {
  icon: string;
  label: string;
} {
  switch (mode) {
    case "remote":
      return { icon: "🏠", label: "Remote" };
    case "in_person":
      return { icon: "📍", label: "In-person" };
    case "either":
    default:
      return { icon: "🌐", label: "Flexible" };
  }
}
