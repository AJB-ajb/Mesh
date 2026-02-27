import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownToolbar } from "../markdown-toolbar";

function createMockTextarea(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): HTMLTextAreaElement {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  Object.defineProperty(textarea, "selectionStart", {
    get: () => selectionStart,
    configurable: true,
  });
  Object.defineProperty(textarea, "selectionEnd", {
    get: () => selectionEnd,
    configurable: true,
  });
  textarea.setSelectionRange = vi.fn();
  textarea.focus = vi.fn();
  return textarea;
}

describe("MarkdownToolbar", () => {
  it("renders all 5 buttons when visible is true", () => {
    const ref = { current: createMockTextarea("", 0, 0) };
    render(
      <MarkdownToolbar textareaRef={ref} onChange={vi.fn()} visible={true} />,
    );
    expect(screen.getByTitle("Slash command")).toBeInTheDocument();
    expect(screen.getByTitle("Heading")).toBeInTheDocument();
    expect(screen.getByTitle("Bold")).toBeInTheDocument();
    expect(screen.getByTitle("List item")).toBeInTheDocument();
    expect(screen.getByTitle("Code")).toBeInTheDocument();
  });

  it("returns null when visible is false", () => {
    const ref = { current: createMockTextarea("", 0, 0) };
    const { container } = render(
      <MarkdownToolbar textareaRef={ref} onChange={vi.fn()} visible={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("slash button inserts / at cursor", () => {
    const onChange = vi.fn();
    const textarea = createMockTextarea("hello world", 5, 5);
    const ref = { current: textarea };

    render(
      <MarkdownToolbar textareaRef={ref} onChange={onChange} visible={true} />,
    );

    fireEvent.mouseDown(screen.getByTitle("Slash command"));
    expect(onChange).toHaveBeenCalledWith("hello/ world");
  });

  it("heading button inserts ## at line start", () => {
    const onChange = vi.fn();
    const textarea = createMockTextarea("hello world", 5, 5);
    const ref = { current: textarea };

    render(
      <MarkdownToolbar textareaRef={ref} onChange={onChange} visible={true} />,
    );

    fireEvent.mouseDown(screen.getByTitle("Heading"));
    expect(onChange).toHaveBeenCalledWith("## hello world");
  });

  it("bold button wraps selection in **", () => {
    const onChange = vi.fn();
    const textarea = createMockTextarea("hello world", 6, 11); // "world" selected
    const ref = { current: textarea };

    render(
      <MarkdownToolbar textareaRef={ref} onChange={onChange} visible={true} />,
    );

    fireEvent.mouseDown(screen.getByTitle("Bold"));
    expect(onChange).toHaveBeenCalledWith("hello **world**");
  });

  it("bold button inserts **** with cursor in middle when no selection", () => {
    const onChange = vi.fn();
    const textarea = createMockTextarea("hello ", 6, 6);
    const ref = { current: textarea };

    render(
      <MarkdownToolbar textareaRef={ref} onChange={onChange} visible={true} />,
    );

    fireEvent.mouseDown(screen.getByTitle("Bold"));
    expect(onChange).toHaveBeenCalledWith("hello ****");
  });

  it("list button inserts - at line start", () => {
    const onChange = vi.fn();
    const textarea = createMockTextarea("item text", 4, 4);
    const ref = { current: textarea };

    render(
      <MarkdownToolbar textareaRef={ref} onChange={onChange} visible={true} />,
    );

    fireEvent.mouseDown(screen.getByTitle("List item"));
    expect(onChange).toHaveBeenCalledWith("- item text");
  });

  it("code button wraps selection in backticks", () => {
    const onChange = vi.fn();
    const textarea = createMockTextarea("use myFunc here", 4, 10); // "myFunc" selected
    const ref = { current: textarea };

    render(
      <MarkdownToolbar textareaRef={ref} onChange={onChange} visible={true} />,
    );

    fireEvent.mouseDown(screen.getByTitle("Code"));
    expect(onChange).toHaveBeenCalledWith("use `myFunc` here");
  });

  it("code button inserts `` with cursor in middle when no selection", () => {
    const onChange = vi.fn();
    const textarea = createMockTextarea("code: ", 6, 6);
    const ref = { current: textarea };

    render(
      <MarkdownToolbar textareaRef={ref} onChange={onChange} visible={true} />,
    );

    fireEvent.mouseDown(screen.getByTitle("Code"));
    expect(onChange).toHaveBeenCalledWith("code: ``");
  });

  it("heading button inserts ## at correct line start on second line", () => {
    const onChange = vi.fn();
    const textarea = createMockTextarea("first\nsecond", 8, 8); // cursor in "second"
    const ref = { current: textarea };

    render(
      <MarkdownToolbar textareaRef={ref} onChange={onChange} visible={true} />,
    );

    fireEvent.mouseDown(screen.getByTitle("Heading"));
    expect(onChange).toHaveBeenCalledWith("first\n## second");
  });
});
