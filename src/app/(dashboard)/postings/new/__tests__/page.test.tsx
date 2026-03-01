import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Mock next/navigation
const mockPush = vi.fn();
const mockRouter = { push: mockPush, replace: vi.fn(), back: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import NewPostingPage from "../page";

describe("NewPostingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title and textarea", () => {
    render(<NewPostingPage />);
    expect(screen.getByText("Create Posting")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("disables Post button when textarea is empty", () => {
    render(<NewPostingPage />);
    const button = screen.getByRole("button", { name: /post/i });
    expect(button).toBeDisabled();
  });

  it("enables Post button when text is entered", () => {
    render(<NewPostingPage />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Looking for 2 devs" } });
    const button = screen.getByRole("button", { name: /post/i });
    expect(button).not.toBeDisabled();
  });

  it("submits posting and redirects with extraction=pending", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ posting: { id: "abc-123" } }),
    });

    render(<NewPostingPage />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
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
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Test posting" } });

    const button = screen.getByRole("button", { name: /post/i });
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });
});
