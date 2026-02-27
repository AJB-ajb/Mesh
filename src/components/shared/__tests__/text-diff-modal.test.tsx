import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextDiffModal, computeWordDiff } from "../text-diff-modal";

describe("computeWordDiff", () => {
  it("returns equal segments for identical text", () => {
    const segments = computeWordDiff("hello world", "hello world");
    expect(segments).toEqual([{ type: "equal", text: "hello world" }]);
  });

  it("detects added words", () => {
    const segments = computeWordDiff("hello", "hello world");
    const added = segments.filter((s) => s.type === "added");
    expect(added.length).toBeGreaterThan(0);
    expect(added.some((s) => s.text.includes("world"))).toBe(true);
  });

  it("detects removed words", () => {
    const segments = computeWordDiff("hello world", "hello");
    const removed = segments.filter((s) => s.type === "removed");
    expect(removed.length).toBeGreaterThan(0);
    expect(removed.some((s) => s.text.includes("world"))).toBe(true);
  });

  it("detects changed words", () => {
    const segments = computeWordDiff("the cat sat", "the dog sat");
    const removed = segments.filter((s) => s.type === "removed");
    const added = segments.filter((s) => s.type === "added");
    expect(removed.some((s) => s.text.includes("cat"))).toBe(true);
    expect(added.some((s) => s.text.includes("dog"))).toBe(true);
  });
});

describe("TextDiffModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onAccept: vi.fn(),
    original: "hello world",
    proposed: "hello brave world",
    title: "Test Diff",
  };

  it("renders original and proposed text", () => {
    render(<TextDiffModal {...defaultProps} />);
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Proposed")).toBeInTheDocument();
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("renders the title", () => {
    render(<TextDiffModal {...defaultProps} />);
    expect(screen.getByText("Test Diff")).toBeInTheDocument();
  });

  it("calls onAccept when Accept button is clicked", () => {
    const onAccept = vi.fn();
    render(<TextDiffModal {...defaultProps} onAccept={onAccept} />);
    fireEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel button is clicked", () => {
    const onClose = vi.fn();
    render(<TextDiffModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows diff highlighting for changed words", () => {
    render(
      <TextDiffModal
        {...defaultProps}
        original="the cat sat"
        proposed="the dog sat"
      />,
    );
    // The proposed panel should contain added/removed highlight spans
    const addedSpan = document.querySelector(".bg-green-100");
    const removedSpan = document.querySelector(".bg-red-100");
    expect(addedSpan).toBeTruthy();
    expect(removedSpan).toBeTruthy();
  });

  it("is not rendered when open is false", () => {
    render(<TextDiffModal {...defaultProps} open={false} />);
    expect(screen.queryByText("Test Diff")).not.toBeInTheDocument();
  });
});
