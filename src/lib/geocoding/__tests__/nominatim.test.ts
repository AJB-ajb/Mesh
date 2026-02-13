// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Fetch mock ----------
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { searchLocations, reverseGeocode } from "../nominatim";

describe("searchLocations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array for empty query", async () => {
    const results = await searchLocations("");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty array for whitespace-only query", async () => {
    const results = await searchLocations("   ");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns formatted results for successful search", async () => {
    const nominatimResults = [
      {
        display_name: "Berlin, Germany",
        lat: "52.5200",
        lon: "13.4050",
        address: {
          city: "Berlin",
          country: "Germany",
          state: "Berlin",
        },
      },
      {
        display_name: "Berlin, NH, USA",
        lat: "44.4688",
        lon: "-71.1854",
        address: {
          city: "Berlin",
          country: "United States",
          state: "New Hampshire",
        },
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => nominatimResults,
    });

    const results = await searchLocations("Berlin");

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      displayName: "Berlin, Germany",
      lat: 52.52,
      lng: 13.405,
      address: {
        city: "Berlin",
        country: "Germany",
        state: "Berlin",
      },
    });
    expect(results[1]).toEqual({
      displayName: "Berlin, United States",
      lat: 44.4688,
      lng: -71.1854,
      address: {
        city: "Berlin",
        country: "United States",
        state: "New Hampshire",
      },
    });
  });

  it("passes limit parameter correctly", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await searchLocations("Berlin", 3);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=3"),
      expect.any(Object),
    );
  });

  it("uses default limit of 5", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await searchLocations("Berlin");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=5"),
      expect.any(Object),
    );
  });

  it("includes User-Agent header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await searchLocations("Berlin");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("MeshIt"),
        }),
      }),
    );
  });

  it("throws on API error (non-200)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(searchLocations("Berlin")).rejects.toThrow(
      "Failed to search locations",
    );
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    await expect(searchLocations("Berlin")).rejects.toThrow(
      "Failed to search locations",
    );
  });

  it("formats result with town fallback when city missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: "Small Town, Country",
          lat: "48.0",
          lon: "11.0",
          address: {
            town: "Small Town",
            country: "Country",
          },
        },
      ],
    });

    const results = await searchLocations("Small Town");
    expect(results[0].displayName).toBe("Small Town, Country");
    expect(results[0].address?.city).toBe("Small Town");
  });

  it("formats result with village fallback when city and town missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: "Tiny Village, Country",
          lat: "48.0",
          lon: "11.0",
          address: {
            village: "Tiny Village",
            country: "Country",
          },
        },
      ],
    });

    const results = await searchLocations("Tiny Village");
    expect(results[0].displayName).toBe("Tiny Village, Country");
    expect(results[0].address?.city).toBe("Tiny Village");
  });

  it("uses full display_name when no city/town/village", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: "Some remote location, Country",
          lat: "48.0",
          lon: "11.0",
          address: {
            country: "Country",
          },
        },
      ],
    });

    const results = await searchLocations("remote");
    expect(results[0].displayName).toBe("Some remote location, Country");
  });

  it("uses city alone when country is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: "Berlin",
          lat: "52.52",
          lon: "13.405",
          address: {
            city: "Berlin",
          },
        },
      ],
    });

    const results = await searchLocations("Berlin");
    expect(results[0].displayName).toBe("Berlin");
  });
});

describe("reverseGeocode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns formatted result on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: "Berlin, Germany",
        lat: "52.5200",
        lon: "13.4050",
        address: {
          city: "Berlin",
          country: "Germany",
          state: "Berlin",
        },
      }),
    });

    const result = await reverseGeocode(52.52, 13.405);

    expect(result).toEqual({
      displayName: "Berlin, Germany",
      lat: 52.52,
      lng: 13.405,
      address: {
        city: "Berlin",
        country: "Germany",
        state: "Berlin",
      },
    });
  });

  it("returns fallback on API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await reverseGeocode(52.52, 13.41);

    expect(result.displayName).toBe("Location (52.52, 13.41)");
    expect(result.lat).toBe(52.52);
    expect(result.lng).toBe(13.41);
  });

  it("returns fallback on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await reverseGeocode(48.14, 11.58);

    expect(result.displayName).toBe("Location (48.14, 11.58)");
    expect(result.lat).toBe(48.14);
    expect(result.lng).toBe(11.58);
  });

  it("formats as City, Country when city available", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: "Munich, Bavaria, Germany",
        lat: "48.1351",
        lon: "11.5820",
        address: {
          city: "Munich",
          country: "Germany",
          state: "Bavaria",
        },
      }),
    });

    const result = await reverseGeocode(48.1351, 11.582);
    expect(result.displayName).toBe("Munich, Germany");
  });

  it("uses town when city is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: "Small Town, Region, Country",
        lat: "49.0",
        lon: "12.0",
        address: {
          town: "Small Town",
          country: "Country",
          state: "Region",
        },
      }),
    });

    const result = await reverseGeocode(49.0, 12.0);
    expect(result.displayName).toBe("Small Town, Country");
    expect(result.address?.city).toBe("Small Town");
  });

  it("passes correct params to API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: "Test",
        lat: "52.0",
        lon: "13.0",
        address: {},
      }),
    });

    await reverseGeocode(52.0, 13.0);

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("reverse");
    expect(calledUrl).toContain("lat=52");
    expect(calledUrl).toContain("lon=13");
    expect(calledUrl).toContain("addressdetails=1");
  });
});
