import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock geocoding module
const mockSearchLocations = vi.fn();
vi.mock("@/lib/geocoding", () => ({
  searchLocations: (...args: unknown[]) => mockSearchLocations(...args),
}));

import { LocationAutocomplete } from "../location-autocomplete";
import type { GeocodingResult } from "@/lib/geocoding/types";

const mockResults: GeocodingResult[] = [
  {
    displayName: "Berlin, Germany",
    lat: 52.52,
    lng: 13.405,
    address: { city: "Berlin", state: "Berlin", country: "Germany" },
  },
  {
    displayName: "Bern, Switzerland",
    lat: 46.9481,
    lng: 7.4474,
    address: { city: "Bern", state: "Bern", country: "Switzerland" },
  },
];

/**
 * Helper: fire change event, advance debounce timer, flush promises.
 * Note: value must differ from the prop value, otherwise React skips onChange.
 */
async function typeAndSearch(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  // Advance timers to fire the debounce callback + flush async
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("LocationAutocomplete", () => {
  const onSelect = vi.fn();
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSearchLocations.mockResolvedValue(mockResults);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders input with placeholder", () => {
    render(
      <LocationAutocomplete
        value=""
        onSelect={onSelect}
        onChange={onChange}
        placeholder="Search location..."
      />,
    );
    expect(
      screen.getByPlaceholderText("Search location..."),
    ).toBeInTheDocument();
  });

  it("calls onChange when user types", () => {
    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    fireEvent.change(input, { target: { value: "Ber" } });
    expect(onChange).toHaveBeenCalledWith("Ber");
  });

  it("triggers debounced search after 500ms", async () => {
    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    fireEvent.change(input, { target: { value: "Berlin" } });

    // Should not have searched yet
    expect(mockSearchLocations).not.toHaveBeenCalled();

    // Advance timers past the debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockSearchLocations).toHaveBeenCalledWith("Berlin", 5);
  });

  it("displays results in dropdown after search", async () => {
    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    await typeAndSearch(input, "Ber");

    expect(screen.getByText("Berlin, Germany")).toBeInTheDocument();
    expect(screen.getByText("Bern, Switzerland")).toBeInTheDocument();
  });

  it("calls onSelect when a result is clicked", async () => {
    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    await typeAndSearch(input, "Berlin");

    expect(screen.getByText("Berlin, Germany")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Berlin, Germany"));
    expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
  });

  it("handles keyboard navigation (ArrowDown, Enter)", async () => {
    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    await typeAndSearch(input, "Berlin");

    expect(screen.getByText("Berlin, Germany")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
  });

  it("closes dropdown on Escape", async () => {
    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    await typeAndSearch(input, "Berlin");

    expect(screen.getByText("Berlin, Germany")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByText("Berlin, Germany")).not.toBeInTheDocument();
  });

  it("does not search for empty/whitespace query", async () => {
    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    fireEvent.change(input, { target: { value: "   " } });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockSearchLocations).not.toHaveBeenCalled();
  });

  it("shows error message when search fails", async () => {
    mockSearchLocations.mockRejectedValue(new Error("Network error"));

    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    await typeAndSearch(input, "Berlin");

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("disables input when disabled prop is true", () => {
    render(
      <LocationAutocomplete
        value=""
        onSelect={onSelect}
        onChange={onChange}
        disabled
      />,
    );
    expect(
      screen.getByPlaceholderText("Search for a location..."),
    ).toBeDisabled();
  });

  it("renders address details in results", async () => {
    render(
      <LocationAutocomplete value="" onSelect={onSelect} onChange={onChange} />,
    );
    const input = screen.getByPlaceholderText("Search for a location...");
    await typeAndSearch(input, "Berlin");

    expect(screen.getByText("Berlin, Berlin, Germany")).toBeInTheDocument();
  });
});
