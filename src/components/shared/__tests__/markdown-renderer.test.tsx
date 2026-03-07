import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "../markdown-renderer";

// ---------------------------------------------------------------------------
// Tests — focused on real logic: hidden syntax, question modes,
// heading normalization, content stripping, null guard
// ---------------------------------------------------------------------------

describe("MarkdownRenderer", () => {
  // -----------------------------------------------------------------------
  // Null / empty guard — prevents rendering empty wrappers
  // -----------------------------------------------------------------------

  it("returns null for empty string", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null for null-ish content", () => {
    const { container } = render(
      <MarkdownRenderer content={null as unknown as string} />,
    );
    expect(container.innerHTML).toBe("");
  });

  // -----------------------------------------------------------------------
  // Hidden content syntax — ||...||
  // -----------------------------------------------------------------------

  describe("hidden content (||..||)", () => {
    it("replaces hidden content with placeholder by default", () => {
      render(<MarkdownRenderer content="Meet at ||Karlsplatz 5||" />);
      expect(
        screen.getByText(/Details shared after acceptance/),
      ).toBeInTheDocument();
      expect(screen.queryByText("Karlsplatz 5")).toBeNull();
    });

    it("reveals hidden content when revealHidden is true", () => {
      render(
        <MarkdownRenderer
          content="Meet at ||Karlsplatz 5||"
          revealHidden={true}
        />,
      );
      expect(screen.getByText(/Karlsplatz 5/)).toBeInTheDocument();
      expect(
        screen.queryByText(/Details shared after acceptance/),
      ).toBeNull();
    });

    it("does not leak the || delimiters into visible text", () => {
      const { container } = render(
        <MarkdownRenderer content="Before ||secret stuff|| after" />,
      );
      expect(container.textContent).not.toContain("||");
    });
  });

  // -----------------------------------------------------------------------
  // Question syntax — ||?...||
  // -----------------------------------------------------------------------

  describe("question content (||?..||)", () => {
    it("shows generic placeholder in default (placeholder) mode", () => {
      render(<MarkdownRenderer content="||? What instrument? ||" />);
      expect(
        screen.getByText(/Questions will be asked when you join/),
      ).toBeInTheDocument();
      expect(screen.queryByText("What instrument?")).toBeNull();
    });

    it("shows the question text with Q: prefix in owner mode", () => {
      render(
        <MarkdownRenderer
          content="||? What instrument? ||"
          questionMode="owner"
        />,
      );
      expect(screen.getByText(/What instrument\?/)).toBeInTheDocument();
    });

    it("does not show raw ||? delimiters in any mode", () => {
      const modes = ["placeholder", "owner"] as const;
      for (const mode of modes) {
        const { container, unmount } = render(
          <MarkdownRenderer
            content="||? Will you attend? ||"
            questionMode={mode}
          />,
        );
        expect(container.textContent).not.toContain("||?");
        unmount();
      }
    });
  });

  // -----------------------------------------------------------------------
  // Heading normalization — real logic: h1 -> h2, h4-h6 -> h3
  // -----------------------------------------------------------------------

  it("downgrades h1 to h2", () => {
    render(<MarkdownRenderer content="# Big Heading" />);
    expect(document.querySelector("h1")).toBeNull();
    expect(document.querySelector("h2")).toHaveTextContent("Big Heading");
  });

  it("downgrades h4 to h3", () => {
    render(<MarkdownRenderer content="#### Sub Heading" />);
    expect(document.querySelector("h4")).toBeNull();
    expect(document.querySelector("h3")).toHaveTextContent("Sub Heading");
  });

  // -----------------------------------------------------------------------
  // Content stripping — images, tables, hrs produce no output element
  // -----------------------------------------------------------------------

  it("strips images completely", () => {
    render(
      <MarkdownRenderer content="![alt](https://img.example.com/pic.png)" />,
    );
    expect(document.querySelector("img")).toBeNull();
  });

  it("strips horizontal rules", () => {
    render(<MarkdownRenderer content={"above\n\n---\n\nbelow"} />);
    expect(document.querySelector("hr")).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Link handling — external links vs mesh: URLs
  // -----------------------------------------------------------------------

  it("external links open in new tab with noopener", () => {
    render(<MarkdownRenderer content="[Go](https://example.com)" />);
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("mesh: URLs render as inline badges, not links", () => {
    render(
      <MarkdownRenderer content="[Berlin](mesh:location?city=Berlin)" />,
    );
    // Should NOT render as a clickable link
    expect(screen.queryByRole("link")).toBeNull();
    // But the display text is still visible
    expect(screen.getByText("Berlin")).toBeInTheDocument();
  });
});
