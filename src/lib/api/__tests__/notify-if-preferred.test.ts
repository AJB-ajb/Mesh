// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain } from "tests/utils/supabase-mock";

import type { SupabaseClient } from "@supabase/supabase-js";

const mockShouldNotify = vi.fn();
const mockSendNotification = vi.fn();

vi.mock("@/lib/notifications/preferences", () => ({
  shouldNotify: (...args: unknown[]) => mockShouldNotify(...args),
}));

vi.mock("@/lib/notifications/create", () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}));

import { notifyIfPreferred } from "../notify-if-preferred";

function createMockSupabase(profileData: unknown, error: unknown = null) {
  const chain = buildChain({ data: profileData, error });
  const mockFrom = vi.fn().mockReturnValue(chain);
  return { from: mockFrom } as unknown as SupabaseClient;
}

const PAYLOAD = {
  userId: "user-1",
  type: "match_accepted",
  title: "Match accepted",
  body: "Your match was accepted",
};

describe("notifyIfPreferred", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends notification when preferences allow", async () => {
    mockShouldNotify.mockReturnValue(true);
    const supabase = createMockSupabase({
      notification_preferences: { match_accepted: { in_app: true } },
    });

    await notifyIfPreferred(
      supabase,
      "user-1",
      "match_accepted" as never,
      PAYLOAD,
    );

    expect(mockShouldNotify).toHaveBeenCalledWith(
      { match_accepted: { in_app: true } },
      "match_accepted",
      "in_app",
    );
    expect(mockSendNotification).toHaveBeenCalledWith(PAYLOAD, supabase);
  });

  it("does NOT send when preferences deny", async () => {
    mockShouldNotify.mockReturnValue(false);
    const supabase = createMockSupabase({
      notification_preferences: { match_accepted: { in_app: false } },
    });

    await notifyIfPreferred(
      supabase,
      "user-1",
      "match_accepted" as never,
      PAYLOAD,
    );

    expect(mockShouldNotify).toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("sends by default when prefs are null (profile has no prefs)", async () => {
    mockShouldNotify.mockReturnValue(true);
    const supabase = createMockSupabase({
      notification_preferences: null,
    });

    await notifyIfPreferred(
      supabase,
      "user-1",
      "match_accepted" as never,
      PAYLOAD,
    );

    expect(mockShouldNotify).toHaveBeenCalledWith(
      null,
      "match_accepted",
      "in_app",
    );
    expect(mockSendNotification).toHaveBeenCalledWith(PAYLOAD, supabase);
  });

  it("does not crash when profile not found", async () => {
    mockShouldNotify.mockReturnValue(false);
    const supabase = createMockSupabase(null, { message: "not found" });

    await expect(
      notifyIfPreferred(supabase, "user-1", "match_accepted" as never, PAYLOAD),
    ).resolves.toBeUndefined();

    // shouldNotify called with undefined/null prefs
    expect(mockShouldNotify).toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
