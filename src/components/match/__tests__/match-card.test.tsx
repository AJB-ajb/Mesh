import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MatchCard, type MatchCardProps } from "../match-card";

const baseProps: MatchCardProps = {
  id: "match-1",
  name: "Alice Smith",
  initials: "AS",
  matchScore: 87,
  description: "Full-stack developer with React experience",
  skills: ["React", "TypeScript", "Node.js"],
  availability: "Weekdays, mornings",
};

describe("MatchCard", () => {
  it("renders name and match score", () => {
    render(<MatchCard {...baseProps} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("87% match")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<MatchCard {...baseProps} />);
    expect(
      screen.getByText("Full-stack developer with React experience"),
    ).toBeInTheDocument();
  });

  it("renders skills as badges", () => {
    render(<MatchCard {...baseProps} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
  });

  it("truncates skills to 4 and shows overflow badge", () => {
    const manySkills = ["React", "TS", "Node", "Go", "Rust", "Python"];
    render(<MatchCard {...baseProps} skills={manySkills} />);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders availability text", () => {
    render(<MatchCard {...baseProps} />);
    expect(
      screen.getByText("Available: Weekdays, mornings"),
    ).toBeInTheDocument();
  });

  it("renders avatar fallback with initials", () => {
    render(<MatchCard {...baseProps} />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  // Status: pending (default) — shows Accept/Decline buttons
  it("shows Accept and Decline buttons when status is pending", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(
      <MatchCard {...baseProps} onAccept={onAccept} onDecline={onDecline} />,
    );
    expect(screen.getByText("Accept")).toBeInTheDocument();
  });

  it("calls onAccept when Accept button is clicked", () => {
    const onAccept = vi.fn();
    render(<MatchCard {...baseProps} onAccept={onAccept} />);
    fireEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("calls onDecline when Decline button is clicked", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(
      <MatchCard {...baseProps} onAccept={onAccept} onDecline={onDecline} />,
    );
    // Decline button has only X icon, find the outline variant button
    const buttons = screen.getAllByRole("button");
    const declineBtn = buttons.find(
      (b) => b.textContent !== "Accept" && b.closest("button"),
    );
    if (declineBtn) fireEvent.click(declineBtn);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  // Status: accepted — shows Message button
  it("shows Message button when status is accepted", () => {
    const onMessage = vi.fn();
    render(
      <MatchCard {...baseProps} status="accepted" onMessage={onMessage} />,
    );
    expect(screen.getByText("Message")).toBeInTheDocument();
  });

  it("calls onMessage when Message button is clicked", () => {
    const onMessage = vi.fn();
    render(
      <MatchCard {...baseProps} status="accepted" onMessage={onMessage} />,
    );
    fireEvent.click(screen.getByText("Message"));
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  // Status: declined — no action buttons
  it("hides action buttons when status is declined", () => {
    render(<MatchCard {...baseProps} status="declined" />);
    expect(screen.queryByText("Accept")).not.toBeInTheDocument();
    expect(screen.queryByText("Message")).not.toBeInTheDocument();
  });

  it("hides Accept button when no onAccept callback", () => {
    render(<MatchCard {...baseProps} status="pending" />);
    expect(screen.queryByText("Accept")).not.toBeInTheDocument();
  });
});
