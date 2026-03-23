import { describe, it, expect } from "vitest";
import { cacheKeys } from "../keys";

describe("cacheKeys", () => {
  it("returns stable key values matching existing hooks", () => {
    expect(cacheKeys.profile()).toBe("profile");
    expect(cacheKeys.notifications()).toBe("header-notifications");
    expect(cacheKeys.connections()).toBe("/api/friendships");
    expect(cacheKeys.settings()).toBe("settings");
    expect(cacheKeys.notificationPreferences()).toBe(
      "notification-preferences",
    );
    expect(cacheKeys.calendarConnections()).toBe("/api/calendar/connections");
    expect(cacheKeys.githubSync()).toBe("/api/github/sync");
  });

  it("generates unique keys for different space ids", () => {
    expect(cacheKeys.space("a")).not.toBe(cacheKeys.space("b"));
    expect(cacheKeys.spacePostings("a")).not.toBe(cacheKeys.spacePostings("b"));
  });
});
