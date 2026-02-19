/**
 * Nominatim (OpenStreetMap) geocoding utilities
 *
 * Free geocoding service with 1 request/second rate limit.
 * Must include User-Agent header as per usage policy.
 */

import type { GeocodingResult, NominatimResult } from "./types";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Mesh/1.0 (Project Matching Platform)";

/**
 * Search for locations by query string (forward geocoding)
 *
 * @param query - Location search query (e.g., "Berlin, Germany")
 * @param limit - Maximum number of results (default: 5)
 * @returns Array of geocoding results
 */
export async function searchLocations(
  query: string,
  limit: number = 5,
): Promise<GeocodingResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: limit.toString(),
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data: NominatimResult[] = await response.json();
    return data.map(formatResult);
  } catch (error) {
    console.error("Forward geocoding error:", error);
    throw new Error("Failed to search locations. Please try again.");
  }
}

/**
 * Reverse geocode coordinates to address
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Geocoding result with formatted address
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodingResult> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
      addressdetails: "1",
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data: NominatimResult = await response.json();
    return formatResult(data);
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    // Return coordinates with generic name if reverse geocoding fails
    return {
      displayName: `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      lat,
      lng,
    };
  }
}

/**
 * Format Nominatim result into standardized GeocodingResult
 */
function formatResult(result: NominatimResult): GeocodingResult {
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);

  // Extract address components
  const address = result.address;
  const city = address?.city || address?.town || address?.village;
  const country = address?.country;
  const state = address?.state;

  // Format display name - prefer "City, Country" format
  let displayName = result.display_name;
  if (city && country) {
    displayName = `${city}, ${country}`;
  } else if (city) {
    displayName = city;
  }

  return {
    displayName,
    lat,
    lng,
    address: {
      city,
      country,
      state,
    },
  };
}
