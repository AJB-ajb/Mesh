import { describe, it, expect } from "vitest";
import { checkAutoResolve } from "../auto-resolve";
import type { SpaceCard, CardOption } from "@/lib/supabase/types";

function makeCard(
  type: SpaceCard["type"],
  data: Record<string, unknown>,
  status: SpaceCard["status"] = "active",
): SpaceCard {
  return {
    id: "card-1",
    space_id: "space-1",
    message_id: null,
    created_by: "user-1",
    type,
    status,
    data: data as unknown as SpaceCard["data"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function opt(label: string, votes: string[] = []): CardOption {
  return { label, votes };
}

describe("checkAutoResolve", () => {
  // ---------- Time Proposal ----------
  describe("time_proposal", () => {
    it("resolves when all members voted and clear winner exists", () => {
      const card = makeCard("time_proposal", {
        title: "Meeting",
        options: [opt("Mon 5pm", ["u1", "u2"]), opt("Tue 5pm", ["u1"])],
        resolved_slot: null,
      });
      const result = checkAutoResolve(card, 2);
      expect(result.shouldResolve).toBe(true);
      expect(result.resolvedData).toEqual({ resolved_slot: "Mon 5pm" });
    });

    it("does NOT resolve when not all members have voted", () => {
      const card = makeCard("time_proposal", {
        title: "Meeting",
        options: [opt("Mon 5pm", ["u1"]), opt("Tue 5pm", [])],
        resolved_slot: null,
      });
      expect(checkAutoResolve(card, 3).shouldResolve).toBe(false);
    });

    it("does NOT resolve on a tie", () => {
      const card = makeCard("time_proposal", {
        title: "Meeting",
        options: [opt("Mon 5pm", ["u1", "u2"]), opt("Tue 5pm", ["u1", "u2"])],
        resolved_slot: null,
      });
      expect(checkAutoResolve(card, 2).shouldResolve).toBe(false);
    });

    it("does NOT resolve if already resolved", () => {
      const card = makeCard(
        "time_proposal",
        {
          title: "Meeting",
          options: [opt("Mon 5pm", ["u1", "u2"])],
          resolved_slot: "Mon 5pm",
        },
        "resolved",
      );
      expect(checkAutoResolve(card, 2).shouldResolve).toBe(false);
    });

    it("handles single-member space", () => {
      const card = makeCard("time_proposal", {
        title: "Solo",
        options: [opt("Mon 5pm", ["u1"]), opt("Tue 5pm", [])],
        resolved_slot: null,
      });
      const result = checkAutoResolve(card, 1);
      expect(result.shouldResolve).toBe(true);
      expect(result.resolvedData).toEqual({ resolved_slot: "Mon 5pm" });
    });
  });

  // ---------- RSVP ----------
  describe("rsvp", () => {
    it("resolves when Yes votes meet threshold", () => {
      const card = makeCard("rsvp", {
        title: "Hackathon",
        options: [
          opt("Yes", ["u1", "u2", "u3"]),
          opt("No", []),
          opt("Maybe", ["u4"]),
        ],
        threshold: 3,
      });
      expect(checkAutoResolve(card, 4).shouldResolve).toBe(true);
    });

    it("does NOT resolve below threshold", () => {
      const card = makeCard("rsvp", {
        title: "Hackathon",
        options: [opt("Yes", ["u1"]), opt("No", ["u2"]), opt("Maybe", ["u3"])],
        threshold: 3,
      });
      expect(checkAutoResolve(card, 4).shouldResolve).toBe(false);
    });

    it("resolves at exact threshold boundary", () => {
      const card = makeCard("rsvp", {
        title: "Dinner",
        options: [opt("Yes", ["u1", "u2"]), opt("No", []), opt("Maybe", [])],
        threshold: 2,
      });
      expect(checkAutoResolve(card, 5).shouldResolve).toBe(true);
    });
  });

  // ---------- Task Claim ----------
  describe("task_claim", () => {
    it("resolves when someone claims", () => {
      const card = makeCard("task_claim", {
        description: "Book the room",
        options: [opt("Claim", ["u2"])],
        claimed_by: null,
      });
      const result = checkAutoResolve(card, 5);
      expect(result.shouldResolve).toBe(true);
      expect(result.resolvedData).toEqual({ claimed_by: "u2" });
    });

    it("does NOT resolve when unclaimed", () => {
      const card = makeCard("task_claim", {
        description: "Book the room",
        options: [opt("Claim", [])],
        claimed_by: null,
      });
      expect(checkAutoResolve(card, 5).shouldResolve).toBe(false);
    });
  });

  // ---------- Poll & Location — never auto-resolve ----------
  describe("poll", () => {
    it("never auto-resolves", () => {
      const card = makeCard("poll", {
        question: "Pizza?",
        options: [opt("Yes", ["u1", "u2"]), opt("No", [])],
      });
      expect(checkAutoResolve(card, 2).shouldResolve).toBe(false);
    });
  });

  describe("location", () => {
    it("never auto-resolves", () => {
      const card = makeCard("location", {
        label: "Pasta Bar",
        options: [opt("Confirm", ["u1"]), opt("Suggest different", [])],
      });
      expect(checkAutoResolve(card, 1).shouldResolve).toBe(false);
    });
  });
});
