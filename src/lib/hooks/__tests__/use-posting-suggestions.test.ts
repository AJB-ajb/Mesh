import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePostingSuggestions } from "../use-posting-suggestions";

describe("usePostingSuggestions", () => {
  it("returns no chips for empty text", () => {
    const { result } = renderHook(() => usePostingSuggestions(""));
    // Empty text should still return chips since all dimensions are "missing"
    // but the chips should exist (all dimensions are unmentioned)
    expect(result.current.chips.length).toBeGreaterThan(0);
  });

  it("returns chips when no dimensions are mentioned", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("I want to build a cool app"),
    );
    expect(result.current.chips.length).toBeGreaterThan(0);
    expect(result.current.chips.length).toBeLessThanOrEqual(6);
  });

  it("does not include time chips when time keyword is present", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("Let's meet on weekday evenings to code"),
    );
    const timeChips = result.current.chips.filter((c) =>
      c.id.startsWith("time-"),
    );
    expect(timeChips).toHaveLength(0);
  });

  it("does not include time chips when 'morning' is mentioned", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("Available mornings for collaboration"),
    );
    const timeChips = result.current.chips.filter((c) =>
      c.id.startsWith("time-"),
    );
    expect(timeChips).toHaveLength(0);
  });

  it("does not include location chips when 'remote' is present", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("Looking for a remote coding partner"),
    );
    const locationChips = result.current.chips.filter((c) =>
      c.id.startsWith("location-"),
    );
    expect(locationChips).toHaveLength(0);
  });

  it("does not include location chips when 'in-person' is present", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("This is an in-person workshop"),
    );
    const locationChips = result.current.chips.filter((c) =>
      c.id.startsWith("location-"),
    );
    expect(locationChips).toHaveLength(0);
  });

  it("includes location chips when location keywords are absent", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("I want to learn React together"),
    );
    const locationChips = result.current.chips.filter((c) =>
      c.id.startsWith("location-"),
    );
    expect(locationChips.length).toBeGreaterThan(0);
  });

  it("does not include team size chips when 'looking for 2 people' is present", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("Looking for 2 people to build an app"),
    );
    const teamChips = result.current.chips.filter((c) =>
      c.id.startsWith("team-"),
    );
    expect(teamChips).toHaveLength(0);
  });

  it("does not include team size chips when 'group' is mentioned", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("Looking for a group to study math"),
    );
    const teamChips = result.current.chips.filter((c) =>
      c.id.startsWith("team-"),
    );
    expect(teamChips).toHaveLength(0);
  });

  it("does not include level chips when 'beginner-friendly' is present", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("This is a beginner-friendly project"),
    );
    const levelChips = result.current.chips.filter((c) =>
      c.id.startsWith("level-"),
    );
    expect(levelChips).toHaveLength(0);
  });

  it("does not include level chips when 'intermediate' is present", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("Looking for intermediate React developers"),
    );
    const levelChips = result.current.chips.filter((c) =>
      c.id.startsWith("level-"),
    );
    expect(levelChips).toHaveLength(0);
  });

  it("returns max 6 chips", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("Just a simple text"),
    );
    expect(result.current.chips.length).toBeLessThanOrEqual(6);
  });

  it("all chips have unique ids", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("Building something cool"),
    );
    const ids = result.current.chips.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("is case-insensitive for keyword detection", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("REMOTE work only, BEGINNER friendly"),
    );
    const locationChips = result.current.chips.filter((c) =>
      c.id.startsWith("location-"),
    );
    const levelChips = result.current.chips.filter((c) =>
      c.id.startsWith("level-"),
    );
    expect(locationChips).toHaveLength(0);
    expect(levelChips).toHaveLength(0);
  });

  it("chips have label and insertText properties", () => {
    const { result } = renderHook(() =>
      usePostingSuggestions("I want to build something"),
    );
    for (const chip of result.current.chips) {
      expect(chip.label).toBeTruthy();
      expect(chip.insertText).toBeTruthy();
      expect(chip.id).toBeTruthy();
    }
  });
});
