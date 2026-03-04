import { describe, it, expect, vi } from "vitest";
import { filterActions } from "../filter-actions";
import type { PaletteAction } from "../actions";

const mockActions: PaletteAction[] = [
  {
    id: "go-discover",
    label: "Go to Discover",
    description: "Browse postings",
    icon: {} as PaletteAction["icon"],
    keywords: ["browse", "explore"],
    execute: vi.fn(),
  },
  {
    id: "go-settings",
    label: "Go to Settings",
    description: "App preferences",
    icon: {} as PaletteAction["icon"],
    keywords: ["preferences", "config"],
    execute: vi.fn(),
  },
  {
    id: "toggle-theme",
    label: "Toggle Theme",
    description: "Switch theme",
    icon: {} as PaletteAction["icon"],
    keywords: ["dark", "light", "mode"],
    execute: vi.fn(),
  },
];

describe("filterActions", () => {
  it("returns all actions when query is empty", () => {
    expect(filterActions(mockActions, "")).toEqual(mockActions);
    expect(filterActions(mockActions, "  ")).toEqual(mockActions);
  });

  it("matches by label substring (case-insensitive)", () => {
    const result = filterActions(mockActions, "settings");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("go-settings");
  });

  it("matches by keyword", () => {
    const result = filterActions(mockActions, "dark");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("toggle-theme");
  });

  it("matches partial keyword", () => {
    const result = filterActions(mockActions, "brow");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("go-discover");
  });

  it("returns empty array when nothing matches", () => {
    const result = filterActions(mockActions, "zzz");
    expect(result).toHaveLength(0);
  });

  it("matches partial label", () => {
    const result = filterActions(mockActions, "go to");
    expect(result).toHaveLength(2);
  });
});
