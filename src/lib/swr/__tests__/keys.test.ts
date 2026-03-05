import { describe, it, expect } from "vitest";
import { cacheKeys } from "../keys";

describe("cacheKeys", () => {
  it("returns stable key values matching existing hooks", () => {
    expect(cacheKeys.profile()).toBe("profile");
    expect(cacheKeys.posting("abc-123")).toBe("posting-detail/abc-123");
    expect(cacheKeys.postings()).toBe("/api/postings");
    expect(cacheKeys.postings("q=test")).toBe("/api/postings?q=test");
    expect(cacheKeys.notifications()).toBe("header-notifications");
    expect(cacheKeys.inbox()).toBe("/api/inbox");
    expect(cacheKeys.bookmarks()).toBe("/api/bookmarks");
    expect(cacheKeys.matches()).toBe("/api/matches/for-me");
    expect(cacheKeys.connections()).toBe("/api/friendships");
    expect(cacheKeys.interests()).toBe("/api/matches/interests");
    expect(cacheKeys.settings()).toBe("settings");
    expect(cacheKeys.notificationPreferences()).toBe(
      "notification-preferences",
    );
    expect(cacheKeys.calendarConnections()).toBe("/api/calendar/connections");
    expect(cacheKeys.availability("recurring", "user-1")).toBe(
      "/api/availability/recurring/user-1",
    );
    expect(cacheKeys.githubSync()).toBe("/api/github/sync");
  });

  it("generates unique keys for different posting ids", () => {
    expect(cacheKeys.posting("a")).not.toBe(cacheKeys.posting("b"));
  });
});
