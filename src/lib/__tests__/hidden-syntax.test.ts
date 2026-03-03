import { describe, it, expect } from "vitest";
import { parseHiddenBlocks, processHiddenContent } from "@/lib/hidden-syntax";

describe("parseHiddenBlocks", () => {
  it("finds inline hidden blocks", () => {
    const text = "Meet near ||Karlsplatz 5, 3rd floor||";
    const blocks = parseHiddenBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe("Karlsplatz 5, 3rd floor");
  });

  it("finds multiple inline hidden blocks", () => {
    const text = "Address: ||Main St 5|| Phone: ||+49 123||";
    const blocks = parseHiddenBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toBe("Main St 5");
    expect(blocks[1].content).toBe("+49 123");
  });

  it("finds block-level hidden content", () => {
    const text =
      "Public text\n||\nSecret line 1\nSecret line 2\n||\nMore public";
    const blocks = parseHiddenBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe("\nSecret line 1\nSecret line 2\n");
  });

  it("returns empty array for text without hidden blocks", () => {
    expect(parseHiddenBlocks("No hidden content here")).toHaveLength(0);
  });

  it("skips hidden syntax inside fenced code blocks", () => {
    const text = "```\n||secret||\n```";
    expect(parseHiddenBlocks(text)).toHaveLength(0);
  });

  it("skips hidden syntax inside inline code", () => {
    const text = "Use `||hidden||` syntax";
    expect(parseHiddenBlocks(text)).toHaveLength(0);
  });

  it("handles empty hidden blocks", () => {
    const text = "Before |||| after";
    const blocks = parseHiddenBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe("");
  });
});

describe("processHiddenContent", () => {
  describe("reveal=false (hide content)", () => {
    it("replaces inline hidden content with placeholder", () => {
      const text = "Meet near ||Karlsplatz 5||";
      const result = processHiddenContent(text, false);
      expect(result).toBe(
        "Meet near \u{1F512} Details shared after acceptance",
      );
    });

    it("replaces multiple hidden blocks", () => {
      const text = "Address: ||Main St|| Phone: ||123||";
      const result = processHiddenContent(text, false);
      expect(result).toContain("\u{1F512} Details shared after acceptance");
      // Should have two placeholders
      const count = (result.match(/\u{1F512}/gu) ?? []).length;
      expect(count).toBe(2);
    });

    it("replaces block-level hidden content", () => {
      const text = "Public\n||\nSecret details\n||\nMore public";
      const result = processHiddenContent(text, false);
      expect(result).toContain("\u{1F512} Details shared after acceptance");
      expect(result).not.toContain("Secret details");
    });

    it("preserves hidden syntax inside code blocks", () => {
      const text = "```\n||secret||\n```";
      const result = processHiddenContent(text, false);
      expect(result).toBe(text);
    });

    it("preserves hidden syntax inside inline code", () => {
      const text = "Use `||hidden||` syntax";
      const result = processHiddenContent(text, false);
      expect(result).toBe(text);
    });
  });

  describe("reveal=true (show content)", () => {
    it("strips || delimiters from inline content", () => {
      const text = "Meet near ||Karlsplatz 5||";
      const result = processHiddenContent(text, true);
      expect(result).toBe("Meet near Karlsplatz 5");
    });

    it("strips || delimiters from block content", () => {
      const text = "Public\n||\nSecret details\n||\nMore public";
      const result = processHiddenContent(text, true);
      expect(result).toBe("Public\n\nSecret details\n\nMore public");
    });

    it("strips multiple hidden blocks", () => {
      const text = "A: ||Main St|| P: ||123||";
      const result = processHiddenContent(text, true);
      expect(result).toBe("A: Main St P: 123");
    });

    it("preserves code block content unchanged", () => {
      const text = "```\n||secret||\n```";
      const result = processHiddenContent(text, true);
      expect(result).toBe(text);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(processHiddenContent("", false)).toBe("");
      expect(processHiddenContent("", true)).toBe("");
    });

    it("handles text with no hidden blocks", () => {
      const text = "Normal text without hidden content";
      expect(processHiddenContent(text, false)).toBe(text);
      expect(processHiddenContent(text, true)).toBe(text);
    });

    it("handles single pipe characters without matching", () => {
      const text = "Use | for tables | like this";
      expect(processHiddenContent(text, false)).toBe(text);
    });
  });
});
