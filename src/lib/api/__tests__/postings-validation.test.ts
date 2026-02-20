// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  validatePostingBody,
  buildPostingDbRow,
} from "@/lib/api/postings-validation";

describe("validatePostingBody", () => {
  it("throws on missing description in create mode", () => {
    expect(() => validatePostingBody({}, "create")).toThrow(
      "Description is required",
    );
  });

  it("throws on blank description in create mode", () => {
    expect(() => validatePostingBody({ description: "   " }, "create")).toThrow(
      "Description is required",
    );
  });

  it("does not throw when description provided in create mode", () => {
    expect(() =>
      validatePostingBody({ description: "A real description" }, "create"),
    ).not.toThrow();
  });

  it("does not throw on missing description in edit mode", () => {
    expect(() => validatePostingBody({}, "edit")).not.toThrow();
  });
});

describe("buildPostingDbRow", () => {
  it("clamps team_size_max between 1 and 10", () => {
    const row = buildPostingDbRow({ lookingFor: "15" }, "create");
    expect(row.team_size_max).toBe(10);

    const row2 = buildPostingDbRow({ lookingFor: "-1" }, "create");
    expect(row2.team_size_max).toBe(1);
  });

  it("clamps team_size_min to not exceed team_size_max", () => {
    const row = buildPostingDbRow(
      { teamSizeMin: "8", lookingFor: "3" },
      "create",
    );
    expect(row.team_size_min).toBe(3);
    expect(row.team_size_max).toBe(3);
  });

  it("validates coordinates — returns null for non-finite values", () => {
    const row = buildPostingDbRow(
      { locationLat: "abc", locationLng: "" },
      "create",
    );
    expect(row.location_lat).toBeNull();
    expect(row.location_lng).toBeNull();
  });

  it("keeps valid coordinates", () => {
    const row = buildPostingDbRow(
      { locationLat: "48.1", locationLng: "11.5" },
      "create",
    );
    expect(row.location_lat).toBe(48.1);
    expect(row.location_lng).toBe(11.5);
  });

  it("parses tags from comma-separated string", () => {
    const row = buildPostingDbRow({ tags: "react, , node, " }, "create");
    expect(row.tags).toEqual(["react", "node"]);
  });

  it("returns empty array when tags is empty string", () => {
    const row = buildPostingDbRow({ tags: "" }, "create");
    expect(row.tags).toEqual([]);
  });

  it("parses autoAccept string 'true' to boolean", () => {
    const row = buildPostingDbRow({ autoAccept: "true" }, "create");
    expect(row.auto_accept).toBe(true);
  });

  it("treats autoAccept string 'false' as false", () => {
    const row = buildPostingDbRow({ autoAccept: "false" }, "create");
    expect(row.auto_accept).toBe(false);
  });

  it("passes through boolean autoAccept", () => {
    const row = buildPostingDbRow({ autoAccept: true }, "create");
    expect(row.auto_accept).toBe(true);
  });

  it("sets visibility=private → mode=friend_ask", () => {
    const row = buildPostingDbRow({ visibility: "private" }, "create");
    expect(row.mode).toBe("friend_ask");
  });

  it("sets visibility=public → mode=open", () => {
    const row = buildPostingDbRow({ visibility: "public" }, "create");
    expect(row.mode).toBe("open");
  });

  it("defaults expires_at to 90 days from now in create mode", () => {
    const row = buildPostingDbRow({}, "create");
    const expires = new Date(row.expires_at as string);
    const diff = expires.getTime() - Date.now();
    // Should be approximately 90 days (allow 1 day tolerance)
    expect(diff).toBeGreaterThan(89 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(91 * 24 * 60 * 60 * 1000);
  });

  it("parses expiresAt in create mode", () => {
    const row = buildPostingDbRow({ expiresAt: "2026-06-15" }, "create");
    expect(row.expires_at).toBe(new Date("2026-06-15T23:59:59").toISOString());
  });

  it("includes updated_at and status in edit mode", () => {
    const row = buildPostingDbRow({ status: "open" }, "edit");
    expect(row.updated_at).toBeDefined();
    expect(row.status).toBe("open");
  });

  it("validates maxDistanceKm — returns null for zero or negative", () => {
    const row = buildPostingDbRow({ maxDistanceKm: "0" }, "create");
    expect(row.max_distance_km).toBeNull();

    const row2 = buildPostingDbRow({ maxDistanceKm: "-5" }, "create");
    expect(row2.max_distance_km).toBeNull();
  });

  it("keeps valid maxDistanceKm", () => {
    const row = buildPostingDbRow({ maxDistanceKm: "50" }, "create");
    expect(row.max_distance_km).toBe(50);
  });
});
