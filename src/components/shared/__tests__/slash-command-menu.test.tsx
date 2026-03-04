import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SlashCommandMenu } from "../slash-command-menu";
import type { SlashCommand } from "@/lib/slash-commands/registry";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockCommands: SlashCommand[] = [
  {
    name: "time",
    icon: "Clock",
    label: "Time",
    description: "Add availability / schedule",
    type: "action",
  },
  {
    name: "location",
    icon: "MapPin",
    label: "Location",
    description: "Add location",
    type: "action",
  },
  {
    name: "skills",
    icon: "Wrench",
    label: "Skills",
    description: "Add required skills",
    type: "action",
  },
];

const defaultProps = {
  commands: mockCommands,
  selectedIndex: 0,
  position: { top: 200, left: 100 },
  onSelect: vi.fn(),
  onClose: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SlashCommandMenu", () => {
  it("renders all passed commands", () => {
    render(<SlashCommandMenu {...defaultProps} />);

    // Portal renders into document.body, so use screen which queries the whole document
    const listbox = screen.getByRole("listbox");
    const menu = within(listbox);

    expect(menu.getByText("/time")).toBeDefined();
    expect(menu.getByText("/location")).toBeDefined();
    expect(menu.getByText("/skills")).toBeDefined();
  });

  it("shows descriptions for each command", () => {
    render(<SlashCommandMenu {...defaultProps} />);

    const listbox = screen.getByRole("listbox");
    const menu = within(listbox);

    expect(menu.getByText("Add availability / schedule")).toBeDefined();
    expect(menu.getByText("Add location")).toBeDefined();
    expect(menu.getByText("Add required skills")).toBeDefined();
  });

  it("marks the correct item as selected", () => {
    render(<SlashCommandMenu {...defaultProps} selectedIndex={1} />);

    const options = screen.getAllByRole("option");
    expect(options[0]?.getAttribute("aria-selected")).toBe("false");
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");
    expect(options[2]?.getAttribute("aria-selected")).toBe("false");
  });

  it("calls onSelect when a command is clicked", () => {
    const onSelect = vi.fn();
    render(<SlashCommandMenu {...defaultProps} onSelect={onSelect} />);

    // Use mouseDown since the component uses onMouseDown
    fireEvent.mouseDown(screen.getByText("/location"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockCommands[1]);
  });

  it("renders nothing when commands array is empty", () => {
    const { container } = render(
      <SlashCommandMenu {...defaultProps} commands={[]} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders with correct position styling", () => {
    render(<SlashCommandMenu {...defaultProps} />);

    const menu = screen.getByRole("listbox");
    expect(menu.style.top).toBe("200px");
    expect(menu.style.left).toBe("100px");
  });
});
