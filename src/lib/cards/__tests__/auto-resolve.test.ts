import { describe, it, expect } from "vitest";
import { checkAutoResolve } from "../auto-resolve";
import type { SpaceCard, CardOption } from "@/lib/supabase/types";

function makeCard(
  type: SpaceCard["type"],
  data: Record<string, unknown>,
  status: SpaceCard["status"] = "active",
  optOuts?: Array<{ user_id: string; reason: "cant_make_any" | "pass" }>,
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
    opt_outs: optOuts ?? [],
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

    it("resolves ties to first-listed option", () => {
      const card = makeCard("time_proposal", {
        title: "Meeting",
        options: [opt("Mon 5pm", ["u1", "u2"]), opt("Tue 5pm", ["u1", "u2"])],
        resolved_slot: null,
      });
      const result = checkAutoResolve(card, 2);
      expect(result.shouldResolve).toBe(true);
      expect(result.resolvedData).toEqual({ resolved_slot: "Mon 5pm" });
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

    it("pass opt-outs reduce effective member count", () => {
      // 3 members, u3 passed → effective count = 2, u1 + u2 voted
      const card = makeCard(
        "time_proposal",
        {
          title: "Dinner",
          options: [opt("Fri 7pm", ["u1", "u2"]), opt("Sat 7pm", ["u1"])],
          resolved_slot: null,
        },
        "active",
        [{ user_id: "u3", reason: "pass" }],
      );
      const result = checkAutoResolve(card, 3);
      expect(result.shouldResolve).toBe(true);
      expect(result.resolvedData).toEqual({ resolved_slot: "Fri 7pm" });
    });

    it("cant_make_any counts as having responded", () => {
      // 3 members, u2 can't make any, u1 voted → only 2 responded out of 3
      const card = makeCard(
        "time_proposal",
        {
          title: "Dinner",
          options: [opt("Fri 7pm", ["u1"]), opt("Sat 7pm", [])],
          resolved_slot: null,
        },
        "active",
        [{ user_id: "u2", reason: "cant_make_any" }],
      );
      // u1 voted + u2 opted out = 2 responded, need 3 → not enough
      expect(checkAutoResolve(card, 3).shouldResolve).toBe(false);

      // With u3 also voting, all 3 have responded
      const card2 = makeCard(
        "time_proposal",
        {
          title: "Dinner",
          options: [opt("Fri 7pm", ["u1", "u3"]), opt("Sat 7pm", [])],
          resolved_slot: null,
        },
        "active",
        [{ user_id: "u2", reason: "cant_make_any" }],
      );
      const result = checkAutoResolve(card2, 3);
      expect(result.shouldResolve).toBe(true);
      expect(result.resolvedData).toEqual({ resolved_slot: "Fri 7pm" });
    });

    it("quorum prevents resolve when not met", () => {
      // All voted, but winner has only 1 vote — quorum requires 2
      const card = makeCard("time_proposal", {
        title: "Meeting",
        options: [opt("Mon 5pm", ["u1"]), opt("Tue 5pm", ["u2"])],
        resolved_slot: null,
        quorum: 2,
      });
      expect(checkAutoResolve(card, 2).shouldResolve).toBe(false);
    });

    it("quorum allows resolve when met", () => {
      const card = makeCard("time_proposal", {
        title: "Meeting",
        options: [opt("Mon 5pm", ["u1", "u2"]), opt("Tue 5pm", ["u3"])],
        resolved_slot: null,
        quorum: 2,
      });
      const result = checkAutoResolve(card, 3);
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
