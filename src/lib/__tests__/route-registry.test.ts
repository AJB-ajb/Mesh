// @vitest-environment node
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Static verification that every fetch("/api/...") and apiMutate("/api/...")
 * call in the codebase has a corresponding route.ts file under src/app/api/.
 */

const ROOT = path.resolve(__dirname, "../../..");

// ---------------------------------------------------------------------------
// 1. Discover all API route patterns from route.ts files
// ---------------------------------------------------------------------------

function discoverRoutePatterns(): string[][] {
  const apiDir = path.join(ROOT, "src/app/api");
  const entries = fs.readdirSync(apiDir, { recursive: true, encoding: "utf8" });
  const routeFiles = entries.filter(
    (e) => typeof e === "string" && e.endsWith("route.ts"),
  );

  return routeFiles.map((file) => {
    // e.g. "friend-ask/[id]/respond/route.ts" → "/api/friend-ask/[id]/respond"
    const relative = file.replace(/\/route\.ts$/, "");
    const segments = ["api", ...relative.split("/")];
    return normalizeSegments(segments);
  });
}

// ---------------------------------------------------------------------------
// 2. Scan source files for fetch/apiMutate calls referencing /api/...
// ---------------------------------------------------------------------------

interface FetchRef {
  file: string;
  line: number;
  raw: string;
  segments: string[];
}

function scanFetchCalls(): FetchRef[] {
  const srcDir = path.join(ROOT, "src");
  const entries = fs.readdirSync(srcDir, { recursive: true, encoding: "utf8" });
  const sourceFiles = entries.filter(
    (e) =>
      typeof e === "string" &&
      (e.endsWith(".ts") || e.endsWith(".tsx")) &&
      !e.startsWith("app/api/") &&
      !e.includes("__tests__/") &&
      !e.includes(".test.") &&
      !e.includes(".spec."),
  );

  const refs: FetchRef[] = [];

  // Match fetch("/api/...", fetch(`/api/...`, apiMutate("/api/...", apiMutate(`/api/...`
  // String literals
  const stringPattern =
    /(?:fetch|apiMutate)\(\s*["']\/api\/([^"']+)["']/g;
  // Template literals — capture up to the closing backtick/quote
  const templatePattern =
    /(?:fetch|apiMutate)\(\s*`\/api\/([^`]+)`/g;

  for (const file of sourceFiles) {
    const fullPath = path.join(srcDir, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const regex of [stringPattern, templatePattern]) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          const raw = `/api/${match[1]}`;
          // Replace template expressions ${...} with __DYN__
          const normalized = raw.replace(/\$\{[^}]+\}/g, "__DYN__");
          const segments = normalizeSegments(normalized.split("/").filter(Boolean));
          refs.push({
            file: path.relative(ROOT, fullPath),
            line: i + 1,
            raw,
            segments,
          });
        }
      }
    }
  }

  return refs;
}

// ---------------------------------------------------------------------------
// 3. Normalization & matching
// ---------------------------------------------------------------------------

function normalizeSegments(segments: string[]): string[] {
  return segments.map((seg) => {
    // [anything] → [param]
    if (seg.startsWith("[") && seg.endsWith("]")) return "[param]";
    // __DYN__ stays as-is (matches any segment)
    if (seg === "__DYN__") return "[param]";
    return seg;
  });
}

function segmentsMatch(fetchSegs: string[], routeSegs: string[]): boolean {
  if (fetchSegs.length !== routeSegs.length) return false;
  return fetchSegs.every(
    (seg, i) =>
      seg === routeSegs[i] ||
      seg === "[param]" ||
      routeSegs[i] === "[param]",
  );
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe("Route Registry", () => {
  it("every fetch/apiMutate /api/ call has a matching route.ts", () => {
    const routePatterns = discoverRoutePatterns();
    const fetchRefs = scanFetchCalls();

    expect(fetchRefs.length).toBeGreaterThan(0);
    expect(routePatterns.length).toBeGreaterThan(0);

    const mismatches = fetchRefs.filter(
      (ref) => !routePatterns.some((rp) => segmentsMatch(ref.segments, rp)),
    );

    if (mismatches.length > 0) {
      const report = mismatches
        .map(
          (m) =>
            `  ${m.file}:${m.line}  →  ${m.raw}`,
        )
        .join("\n");

      expect.fail(
        `Found ${mismatches.length} fetch/apiMutate call(s) with no matching route.ts:\n${report}`,
      );
    }
  });
});
