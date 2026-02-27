import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "../markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders bold text", () => {
    render(<MarkdownRenderer content="Hello **world**" />);
    const strong = document.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent("world");
  });

  it("renders bullet lists", () => {
    render(<MarkdownRenderer content={"- item 1\n\n- item 2"} />);
    const items = document.querySelectorAll("li");
    expect(items).toHaveLength(2);
  });

  it("renders headings (h2, h3)", () => {
    render(
      <MarkdownRenderer content={"## Heading Two\n\n### Heading Three"} />,
    );
    expect(document.querySelector("h2")).toHaveTextContent("Heading Two");
    expect(document.querySelector("h3")).toHaveTextContent("Heading Three");
  });

  it("downgrades h1 to h2", () => {
    render(<MarkdownRenderer content="# Big Heading" />);
    expect(document.querySelector("h1")).toBeNull();
    expect(document.querySelector("h2")).toHaveTextContent("Big Heading");
  });

  it("downgrades h4-h6 to h3", () => {
    render(<MarkdownRenderer content="#### Sub Heading" />);
    expect(document.querySelector("h4")).toBeNull();
    expect(document.querySelector("h3")).toHaveTextContent("Sub Heading");
  });

  it("renders inline code", () => {
    render(<MarkdownRenderer content="Use `useState` hook" />);
    expect(document.querySelector("code")).toHaveTextContent("useState");
  });

  it("renders links with target=_blank", () => {
    render(<MarkdownRenderer content="[Click here](https://example.com)" />);
    const link = screen.getByRole("link", { name: "Click here" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("strips images", () => {
    render(
      <MarkdownRenderer content="![alt](https://img.example.com/pic.png)" />,
    );
    expect(document.querySelector("img")).toBeNull();
  });

  it("strips tables", () => {
    render(<MarkdownRenderer content="| A | B |\n|---|---|\n| 1 | 2 |" />);
    expect(document.querySelector("table")).toBeNull();
  });

  it("strips horizontal rules", () => {
    render(<MarkdownRenderer content="above\n\n---\n\nbelow" />);
    expect(document.querySelector("hr")).toBeNull();
  });

  it("returns null for empty content", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null for null-ish content", () => {
    const { container } = render(
      <MarkdownRenderer content={null as unknown as string} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("applies clamp class", () => {
    const { container } = render(
      <MarkdownRenderer content="Hello" clamp={2} />,
    );
    expect(container.firstChild).toHaveClass("line-clamp-2");
  });

  it("applies custom className", () => {
    const { container } = render(
      <MarkdownRenderer content="Hello" className="text-red-500" />,
    );
    expect(container.firstChild).toHaveClass("text-red-500");
  });
});
