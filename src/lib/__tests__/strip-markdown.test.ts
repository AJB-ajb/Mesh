import { describe, it, expect } from "vitest";
import { stripMarkdown } from "../strip-markdown";

describe("stripMarkdown", () => {
  it("strips heading markers", () => {
    expect(stripMarkdown("## Hello world")).toBe("Hello world");
    expect(stripMarkdown("# Title\nBody")).toBe("Title Body");
  });

  it("strips bold and italic markers", () => {
    expect(stripMarkdown("**bold** text")).toBe("bold text");
    expect(stripMarkdown("*italic* text")).toBe("italic text");
    expect(stripMarkdown("__bold__ and _italic_")).toBe("bold and italic");
  });

  it("strips inline code backticks", () => {
    expect(stripMarkdown("run `npm install`")).toBe("run npm install");
  });

  it("extracts link text, drops URL", () => {
    expect(stripMarkdown("[click here](https://example.com)")).toBe(
      "click here",
    );
  });

  it("strips image syntax, keeps alt text", () => {
    expect(stripMarkdown("![photo](https://img.png)")).toBe("photo");
  });

  it("strips list markers", () => {
    expect(stripMarkdown("- item one\n- item two")).toBe("item one item two");
    expect(stripMarkdown("1. first\n2. second")).toBe("first second");
  });

  it("handles hidden syntax", () => {
    expect(stripMarkdown("visible ||hidden||")).toBe("visible");
    expect(stripMarkdown("||?question||")).toBe("question");
  });

  it("collapses whitespace", () => {
    expect(stripMarkdown("line one\n\nline two")).toBe("line one line two");
  });

  it("passes through plain text unchanged", () => {
    expect(stripMarkdown("just a message")).toBe("just a message");
  });

  it("handles empty / whitespace input", () => {
    expect(stripMarkdown("")).toBe("");
    expect(stripMarkdown("   ")).toBe("");
  });
});
