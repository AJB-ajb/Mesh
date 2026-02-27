import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SuggestionChips } from "../suggestion-chips";
import type { SuggestionChip } from "@/lib/hooks/use-posting-suggestions";

const mockChips: SuggestionChip[] = [
  {
    id: "time-weekday",
    label: "weekday evenings",
    insertText: "weekday evenings",
  },
  { id: "location-remote", label: "remote", insertText: "remote" },
  {
    id: "team-small",
    label: "small team (2-3)",
    insertText: "small team (2-3)",
  },
];

describe("SuggestionChips", () => {
  it("renders all chips", () => {
    render(
      <SuggestionChips
        chips={mockChips}
        onChipClick={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText("weekday evenings")).toBeInTheDocument();
    expect(screen.getByText("remote")).toBeInTheDocument();
    expect(screen.getByText("small team (2-3)")).toBeInTheDocument();
  });

  it("calls onChipClick when a chip is clicked", () => {
    const onChipClick = vi.fn();
    render(
      <SuggestionChips
        chips={mockChips}
        onChipClick={onChipClick}
        onDismiss={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("remote"));
    expect(onChipClick).toHaveBeenCalledOnce();
    expect(onChipClick).toHaveBeenCalledWith(mockChips[1]);
  });

  it("calls onDismiss when dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <SuggestionChips
        chips={mockChips}
        onChipClick={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    const dismissButton = screen.getByRole("button", {
      name: /dismiss suggestions/i,
    });
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("returns null when chips array is empty", () => {
    const { container } = render(
      <SuggestionChips chips={[]} onChipClick={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(container.innerHTML).toBe("");
  });
});
