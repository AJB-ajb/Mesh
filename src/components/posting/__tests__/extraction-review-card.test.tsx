import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExtractionReviewCard } from "../extraction-review-card";

const defaultProps = {
  status: "idle" as const,
  appliedFields: null,
  undo: vi.fn(),
  dismiss: vi.fn(),
  retry: vi.fn(),
};

describe("ExtractionReviewCard", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<ExtractionReviewCard {...defaultProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows loading skeleton when extracting", () => {
    render(<ExtractionReviewCard {...defaultProps} status="extracting" />);
    expect(screen.getByText(/extracting details/i)).toBeInTheDocument();
  });

  it("shows error state with retry button", () => {
    render(<ExtractionReviewCard {...defaultProps} status="error" />);
    expect(screen.getByText(/failed to extract/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows applied summary with undo when applied", () => {
    render(
      <ExtractionReviewCard
        {...defaultProps}
        status="applied"
        appliedFields={{
          category: "study",
          skills: ["React", "TypeScript"],
          tags: ["hackathon"],
        }}
      />,
    );
    expect(screen.getByText("study")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("#hackathon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });
});
