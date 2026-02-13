import { describe, it, expect } from "vitest";
import {
  shouldNotify,
  defaultNotificationPreferences,
  type NotificationPreferences,
} from "../preferences";

describe("shouldNotify", () => {
  it("returns true when prefs is null", () => {
    expect(shouldNotify(null, "new_message", "in_app")).toBe(true);
  });

  it("returns true when prefs is undefined", () => {
    expect(shouldNotify(undefined, "friend_request", "browser")).toBe(true);
  });

  it("returns true when the channel is missing from prefs", () => {
    const prefs = {} as unknown as NotificationPreferences;
    expect(shouldNotify(prefs, "new_message", "in_app")).toBe(true);
  });

  it("returns the preference value when set to true", () => {
    expect(
      shouldNotify(defaultNotificationPreferences, "new_message", "in_app"),
    ).toBe(true);
  });

  it("returns the preference value when set to false", () => {
    expect(
      shouldNotify(
        defaultNotificationPreferences,
        "application_rejected",
        "browser",
      ),
    ).toBe(false);
  });

  it("returns false for browser match_found with default prefs", () => {
    expect(
      shouldNotify(defaultNotificationPreferences, "match_found", "browser"),
    ).toBe(false);
  });

  it("returns true for in_app match_found with default prefs", () => {
    expect(
      shouldNotify(defaultNotificationPreferences, "match_found", "in_app"),
    ).toBe(true);
  });

  it("respects custom preferences", () => {
    const prefs: NotificationPreferences = {
      ...defaultNotificationPreferences,
      in_app: {
        ...defaultNotificationPreferences.in_app,
        new_message: false,
      },
    };
    expect(shouldNotify(prefs, "new_message", "in_app")).toBe(false);
  });

  it("falls back to true for unknown type", () => {
    const prefs = defaultNotificationPreferences;
    // Cast to simulate a type that doesn't exist in the preferences
    expect(
      shouldNotify(
        prefs,
        "unknown_type" as unknown as Parameters<typeof shouldNotify>[1],
        "in_app",
      ),
    ).toBe(true);
  });
});
