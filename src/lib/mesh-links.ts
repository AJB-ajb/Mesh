/**
 * mesh: URL scheme -- custom protocol for structured inline data.
 * Format: [emoji display text](mesh:type?key=val&key2=val2)
 */

export type MeshLinkType = "location" | "time" | "skills";

export interface ParsedMeshUrl {
  type: MeshLinkType;
  params: Record<string, string>;
}

const VALID_TYPES: readonly string[] = ["location", "time", "skills"];

/**
 * Parse a mesh: URL into its type and parameters.
 * Returns null if the URL is not a valid mesh: URL.
 */
export function parseMeshUrl(url: string): ParsedMeshUrl | null {
  if (!url.startsWith("mesh:")) return null;
  const rest = url.slice(5); // remove "mesh:"
  const [type, queryString] = rest.split("?", 2);
  if (!type || !VALID_TYPES.includes(type)) return null;
  const params: Record<string, string> = {};
  if (queryString) {
    for (const pair of queryString.split("&")) {
      const [key, ...valueParts] = pair.split("=");
      if (key) params[key] = decodeURIComponent(valueParts.join("="));
    }
  }
  return { type: type as MeshLinkType, params };
}

const EMOJI: Record<MeshLinkType, string> = {
  location: "\uD83D\uDCCD",
  time: "\uD83D\uDD50",
  skills: "\uD83D\uDEE0\uFE0F",
};

/**
 * Build a mesh: markdown link.
 * Example: buildMeshLink("location", "Berlin", { lat: "52.52", lng: "13.405" })
 *   -> "[pin Berlin](mesh:location?lat=52.52&lng=13.405)"
 */
export function buildMeshLink(
  type: MeshLinkType,
  display: string,
  params: Record<string, string>,
): string {
  const emoji = EMOJI[type] ?? "";
  const queryString = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  const url = queryString ? `mesh:${type}?${queryString}` : `mesh:${type}`;
  return `[${emoji} ${display}](${url})`;
}

/**
 * Check if a URL is a mesh: URL.
 */
export function isMeshUrl(href: string): boolean {
  return href.startsWith("mesh:");
}
