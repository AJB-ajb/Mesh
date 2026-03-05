import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Mock next/navigation
const mockPush = vi.fn();
const mockRouter = { push: mockPush, replace: vi.fn(), back: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock MeshEditor — CodeMirror relies on browser APIs unavailable in jsdom.
// This lightweight mock exposes the same props surface as the real component
// so the page's wiring (onChange, onSubmit, etc.) is still exercised.
vi.mock("@/components/editor/mesh-editor", () => ({
  MeshEditor: (props: {
    content?: string;
    placeholder?: string;
    onChange?: (md: string) => void;
    onSubmit?: () => void;
    onEditorReady?: (editor: unknown) => void;
    onFocus?: () => void;
    onBlur?: () => void;
  }) => {
    return (
      <textarea
        data-testid="mock-editor"
        value={props.content}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    );
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import NewPostingPage from "../page";

describe("NewPostingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the editor and back link", () => {
    render(<NewPostingPage />);
    expect(screen.getByText("Back to postings")).toBeInTheDocument();
    expect(screen.getByTestId("mock-editor")).toBeInTheDocument();
  });

  it("disables Post button when textarea is empty", () => {
    render(<NewPostingPage />);
    const button = screen.getByRole("button", { name: /post/i });
    expect(button).toBeDisabled();
  });

  it("enables Post button when text is entered", () => {
    render(<NewPostingPage />);
    const editor = screen.getByTestId("mock-editor");
    fireEvent.change(editor, { target: { value: "Looking for 2 devs" } });
    const button = screen.getByRole("button", { name: /post/i });
    expect(button).not.toBeDisabled();
  });

  it("submits posting and redirects with extraction=pending", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ posting: { id: "abc-123" } }),
    });

    render(<NewPostingPage />);
    const editor = screen.getByTestId("mock-editor");
    fireEvent.change(editor, {
      target: { value: "Need 2 people for hackathon" },
    });

    const button = screen.getByRole("button", { name: /post/i });
    fireEvent.click(button);

    // Wait for the fetch to complete
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/postings",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/postings/abc-123?extraction=pending",
      );
    });
  });

  it("shows collapsible edit details section", () => {
    render(<NewPostingPage />);
    const toggle = screen.getByText("Edit details manually");
    expect(toggle).toBeInTheDocument();
  });

  it("shows error on failed submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Server error" } }),
    });

    render(<NewPostingPage />);
    const editor = screen.getByTestId("mock-editor");
    fireEvent.change(editor, { target: { value: "Test posting" } });

    const button = screen.getByRole("button", { name: /post/i });
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });
});
