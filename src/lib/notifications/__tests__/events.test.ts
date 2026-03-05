import { describe, it, expect } from "vitest";
import {
  INVITE_RECEIVED,
  INVITE_ACCEPTED,
  INVITE_DECLINED,
  CONNECTION_REQUEST,
  APPLICATION_ACCEPTED,
  APPLICATION_REJECTED,
  MATCHES_FOUND,
} from "../events";
import { allNotificationTypes } from "../preferences";

describe("notification event constants", () => {
  it("every event type is present in allNotificationTypes", () => {
    const events = [
      INVITE_RECEIVED,
      INVITE_ACCEPTED,
      INVITE_DECLINED,
      CONNECTION_REQUEST,
      APPLICATION_ACCEPTED,
      APPLICATION_REJECTED,
      MATCHES_FOUND,
    ];

    for (const event of events) {
      expect(
        allNotificationTypes,
        `Expected allNotificationTypes to include "${event.type}" (from event with title "${event.title}")`,
      ).toContain(event.type);
    }
  });
});
