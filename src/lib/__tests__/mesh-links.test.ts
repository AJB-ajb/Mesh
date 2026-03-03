import { describe, it, expect } from "vitest";
import { parseMeshUrl, buildMeshLink, isMeshUrl } from "../mesh-links";

// ---------------------------------------------------------------------------
// parseMeshUrl
// ---------------------------------------------------------------------------

describe("parseMeshUrl", () => {
  it("parses a valid location URL", () => {
    const result = parseMeshUrl("mesh:location?lat=52.52&lng=13.405");
    expect(result).toEqual({
      type: "location",
      params: { lat: "52.52", lng: "13.405" },
    });
  });

  it("parses a valid time URL", () => {
    const result = parseMeshUrl(
      "mesh:time?days=mon%2Ctue&times=morning%2Cevening",
    );
    expect(result).toEqual({
      type: "time",
      params: { days: "mon,tue", times: "morning,evening" },
    });
  });

  it("parses a valid skills URL", () => {
    const result = parseMeshUrl(
      "mesh:skills?skills=%5B%7B%22skillId%22%3A%22s1%22%7D%5D",
    );
    expect(result).toEqual({
      type: "skills",
      params: { skills: '[{"skillId":"s1"}]' },
    });
  });

  it("parses a URL with no query parameters", () => {
    const result = parseMeshUrl("mesh:location");
    expect(result).toEqual({ type: "location", params: {} });
  });

  it("returns null for non-mesh URLs", () => {
    expect(parseMeshUrl("http://example.com")).toBeNull();
    expect(parseMeshUrl("https://example.com")).toBeNull();
    expect(parseMeshUrl("ftp://example.com")).toBeNull();
  });

  it("returns null for unknown mesh types", () => {
    expect(parseMeshUrl("mesh:unknown")).toBeNull();
    expect(parseMeshUrl("mesh:foo?bar=1")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseMeshUrl("")).toBeNull();
  });

  it("returns null for mesh: with no type", () => {
    expect(parseMeshUrl("mesh:")).toBeNull();
  });

  it("handles values with equals signs", () => {
    const result = parseMeshUrl("mesh:location?displayName=A%3DB");
    expect(result).toEqual({
      type: "location",
      params: { displayName: "A=B" },
    });
  });

  it("handles values with encoded special characters", () => {
    const result = parseMeshUrl(
      "mesh:location?displayName=Berlin%2C%20Germany",
    );
    expect(result).toEqual({
      type: "location",
      params: { displayName: "Berlin, Germany" },
    });
  });
});

// ---------------------------------------------------------------------------
// buildMeshLink
// ---------------------------------------------------------------------------

describe("buildMeshLink", () => {
  it("builds a location link", () => {
    const result = buildMeshLink("location", "Berlin", {
      lat: "52.52",
      lng: "13.405",
    });
    expect(result).toBe(
      "[\uD83D\uDCCD Berlin](mesh:location?lat=52.52&lng=13.405)",
    );
  });

  it("builds a time link", () => {
    const result = buildMeshLink("time", "weekdays morning", {
      days: "mon,tue,wed,thu,fri",
      times: "morning",
    });
    expect(result).toBe(
      "[\uD83D\uDD50 weekdays morning](mesh:time?days=mon%2Ctue%2Cwed%2Cthu%2Cfri&times=morning)",
    );
  });

  it("builds a skills link", () => {
    const result = buildMeshLink("skills", "Skills: React", {
      skills: '[{"skillId":"s1","name":"React"}]',
    });
    expect(result).toContain("mesh:skills?skills=");
    expect(result.startsWith("[\uD83D\uDEE0\uFE0F Skills: React]")).toBe(true);
  });

  it("encodes special characters in values", () => {
    const result = buildMeshLink("location", "Berlin, Germany", {
      displayName: "Berlin, Germany",
    });
    expect(result).toContain("displayName=Berlin%2C%20Germany");
  });

  it("filters out empty string values", () => {
    const result = buildMeshLink("location", "Berlin", {
      lat: "52.52",
      lng: "",
    });
    expect(result).toBe("[\uD83D\uDCCD Berlin](mesh:location?lat=52.52)");
  });

  it("produces mesh:type with no query when all params empty", () => {
    const result = buildMeshLink("location", "Remote", {});
    expect(result).toBe("[\uD83D\uDCCD Remote](mesh:location)");
  });
});

// ---------------------------------------------------------------------------
// isMeshUrl
// ---------------------------------------------------------------------------

describe("isMeshUrl", () => {
  it("returns true for mesh: URLs", () => {
    expect(isMeshUrl("mesh:location")).toBe(true);
    expect(isMeshUrl("mesh:time?days=mon")).toBe(true);
    expect(isMeshUrl("mesh:skills")).toBe(true);
  });

  it("returns false for http URLs", () => {
    expect(isMeshUrl("http://example.com")).toBe(false);
    expect(isMeshUrl("https://example.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isMeshUrl("")).toBe(false);
  });

  it("returns false for partial match", () => {
    expect(isMeshUrl("notmesh:location")).toBe(false);
  });
});
