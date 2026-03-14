import { describe, it, expect } from "vitest";
import {
  filterCommandsByContext,
  filterCommands,
  SLASH_COMMANDS,
} from "../registry";

describe("slash-commands registry", () => {
  describe("filterCommandsByContext", () => {
    it("returns all commands when no context is provided", () => {
      expect(filterCommandsByContext()).toEqual(SLASH_COMMANDS);
    });

    it("filters posting-only commands for profile context", () => {
      const profileCmds = filterCommandsByContext("profile");
      const names = profileCmds.map((c) => c.name);

      // Should include universal commands
      expect(names).toContain("time");
      expect(names).toContain("format");

      // Should include profile commands
      expect(names).toContain("availability");
      expect(names).toContain("calendar");

      // Should NOT include posting-only commands
      expect(names).not.toContain("visibility");
      expect(names).not.toContain("invite");
      expect(names).not.toContain("question");
    });

    it("filters profile-only commands for posting context", () => {
      const postingCmds = filterCommandsByContext("posting");
      const names = postingCmds.map((c) => c.name);

      // Should include posting commands
      expect(names).toContain("visibility");
      expect(names).toContain("invite");

      // Should NOT include profile commands
      expect(names).not.toContain("availability");
      expect(names).not.toContain("calendar");
    });

    it("returns only message-relevant commands for message context", () => {
      const messageCmds = filterCommandsByContext("message");
      const names = messageCmds.map((c) => c.name);

      // Message-scoped commands
      expect(names).toContain("time");
      expect(names).toContain("location");

      // Not useful in messages
      expect(names).not.toContain("format");
      expect(names).not.toContain("clean");
      expect(names).not.toContain("skills");

      // No context-specific commands
      expect(names).not.toContain("visibility");
      expect(names).not.toContain("availability");
      expect(names).not.toContain("hidden");
      expect(names).not.toContain("template");
    });

    it("returns state-text commands including time/location", () => {
      const stCmds = filterCommandsByContext("state-text");
      const names = stCmds.map((c) => c.name);

      expect(names).toContain("format");
      expect(names).toContain("time");
      expect(names).toContain("location");
      expect(names).not.toContain("invite");
      expect(names).not.toContain("calendar");
    });

    it("handles array context on commands (template is posting+profile)", () => {
      const postingCmds = filterCommandsByContext("posting");
      const profileCmds = filterCommandsByContext("profile");
      const messageCmds = filterCommandsByContext("message");

      expect(postingCmds.map((c) => c.name)).toContain("template");
      expect(profileCmds.map((c) => c.name)).toContain("template");
      expect(messageCmds.map((c) => c.name)).not.toContain("template");
    });
  });

  describe("filterCommands", () => {
    it("filters by query matching name or label", () => {
      const results = filterCommands("ti");
      expect(results.some((c) => c.name === "time")).toBe(true);
    });

    it("returns empty array for non-matching query", () => {
      const results = filterCommands("zzzznotacommand");
      expect(results).toEqual([]);
    });
  });
});
