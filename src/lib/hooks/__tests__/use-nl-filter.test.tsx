import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNlFilter } from "../use-nl-filter";

// ---------------------------------------------------------------------------
// Mock the global fetch
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useNlFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty state", () => {
    const { result } = renderHook(() => useNlFilter());

    expect(result.current.nlQuery).toBe("");
    expect(result.current.nlFilters).toEqual({});
    expect(result.current.nlFilterPills).toEqual([]);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.isTranslating).toBe(false);
  });

  it("updates nlQuery via setNlQuery", () => {
    const { result } = renderHook(() => useNlFilter());

    act(() => {
      result.current.setNlQuery("remote React");
    });

    expect(result.current.nlQuery).toBe("remote React");
  });

  it("handles NL search and sets filters", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: { skills: ["React"], location_mode: "remote" },
      }),
    });

    const { result } = renderHook(() => useNlFilter());

    await act(async () => {
      await result.current.handleNlSearch("remote React");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/filters/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "remote React" }),
    });
    expect(result.current.nlFilters).toEqual({
      skills: ["React"],
      location_mode: "remote",
    });
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.nlFilterPills.length).toBeGreaterThan(0);
  });

  it("skips search for empty query", async () => {
    const { result } = renderHook(() => useNlFilter());

    await act(async () => {
      await result.current.handleNlSearch("   ");
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.nlFilters).toEqual({});
  });

  it("handles API error gracefully (falls back silently)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Bad request" }),
    });

    const { result } = renderHook(() => useNlFilter());

    await act(async () => {
      await result.current.handleNlSearch("invalid query");
    });

    expect(result.current.nlFilters).toEqual({});
    expect(result.current.isTranslating).toBe(false);
  });

  it("clears filters", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: { skills: ["React"] },
      }),
    });

    const { result } = renderHook(() => useNlFilter());

    await act(async () => {
      await result.current.handleNlSearch("React");
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.nlFilters).toEqual({});
    expect(result.current.nlQuery).toBe("");
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("removes a specific filter by key", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: { skills: ["React"], location_mode: "remote" },
      }),
    });

    const { result } = renderHook(() => useNlFilter());

    await act(async () => {
      await result.current.handleNlSearch("remote React");
    });

    expect(result.current.nlFilterPills.length).toBe(2);

    act(() => {
      result.current.handleRemoveNlFilter("skills");
    });

    expect(result.current.nlFilters.skills).toBeUndefined();
    expect(result.current.nlFilters.location_mode).toBe("remote");
  });

  it("calls onCategoryChange when filters include category", async () => {
    const onCategoryChange = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: { category: "study" },
      }),
    });

    const { result } = renderHook(() => useNlFilter({ onCategoryChange }));

    await act(async () => {
      await result.current.handleNlSearch("study groups");
    });

    expect(onCategoryChange).toHaveBeenCalledWith("study");
  });

  it("calls onVisibilityChange when filters include visibility", async () => {
    const onVisibilityChange = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: { visibility: "public" },
      }),
    });

    const { result } = renderHook(() => useNlFilter({ onVisibilityChange }));

    await act(async () => {
      await result.current.handleNlSearch("public postings");
    });

    expect(onVisibilityChange).toHaveBeenCalledWith("public");
  });

  it("calls onCategoryChange(undefined) when removing category filter", async () => {
    const onCategoryChange = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: { category: "study" },
      }),
    });

    const { result } = renderHook(() => useNlFilter({ onCategoryChange }));

    await act(async () => {
      await result.current.handleNlSearch("study");
    });

    onCategoryChange.mockClear();

    act(() => {
      result.current.handleRemoveNlFilter("category");
    });

    expect(onCategoryChange).toHaveBeenCalledWith(undefined);
  });
});
