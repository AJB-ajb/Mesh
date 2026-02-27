import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuidedPrompts } from "../guided-prompts";

const defaultProps = {
  onComplete: vi.fn(),
  onSkip: vi.fn(),
};

describe("GuidedPrompts", () => {
  it("renders step 1 initially", () => {
    render(<GuidedPrompts {...defaultProps} />);
    expect(screen.getByText("What are you good at?")).toBeInTheDocument();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("next button advances to step 2", () => {
    render(<GuidedPrompts {...defaultProps} />);
    fireEvent.click(screen.getByText("Next"));
    expect(
      screen.getByText("What do you want to learn or work on?"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("back button goes to step 1", () => {
    render(<GuidedPrompts {...defaultProps} />);
    // Advance to step 2
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    // Go back
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("step 3 review button goes to review", () => {
    render(<GuidedPrompts {...defaultProps} />);
    // Advance to step 2
    fireEvent.click(screen.getByText("Next"));
    // Advance to step 3
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    // Click review
    fireEvent.click(screen.getByText("Review"));
    expect(screen.getByText("Here's your profile draft")).toBeInTheDocument();
  });

  it("review shows assembled text", () => {
    render(<GuidedPrompts {...defaultProps} />);
    // Fill in step 1
    const textarea1 = screen.getByPlaceholderText(/I've been doing Python/);
    fireEvent.change(textarea1, { target: { value: "I know Python" } });
    // Advance to step 2
    fireEvent.click(screen.getByText("Next"));
    const textarea2 = screen.getByPlaceholderText(/I want to learn React/);
    fireEvent.change(textarea2, { target: { value: "I want to learn AI" } });
    // Advance to step 3
    fireEvent.click(screen.getByText("Next"));
    const textarea3 = screen.getByPlaceholderText(/Last month I built/);
    fireEvent.change(textarea3, {
      target: { value: "Built a REST API" },
    });
    // Go to review
    fireEvent.click(screen.getByText("Review"));

    // The review textarea should contain the assembled text
    const reviewTextarea = screen.getByDisplayValue(/I know Python/);
    expect(reviewTextarea).toBeInTheDocument();
  });

  it("save button calls onComplete with assembled text", () => {
    const onComplete = vi.fn();
    render(<GuidedPrompts {...defaultProps} onComplete={onComplete} />);
    // Fill in step 1
    const textarea1 = screen.getByPlaceholderText(/I've been doing Python/);
    fireEvent.change(textarea1, { target: { value: "I know Python" } });
    // Advance through steps
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Review"));
    // Save
    fireEvent.click(screen.getByText("Save Profile"));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toContain("I know Python");
  });

  it("skip button calls onSkip", () => {
    const onSkip = vi.fn();
    render(<GuidedPrompts {...defaultProps} onSkip={onSkip} />);
    fireEvent.click(screen.getByText("Skip for now"));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
