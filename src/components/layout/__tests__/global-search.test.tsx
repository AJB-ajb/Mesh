import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SearchResult } from "@/lib/hooks/use-search";

// jsdom stubs
Element.prototype.scrollIntoView = vi.fn();
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mocks — only what's required to isolate this component from network/router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockUseSearch = vi.fn();
vi.mock("@/lib/hooks/use-search", () => ({
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

import { GlobalSearch } from "../global-search";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const postingResult: SearchResult = {
  id: "post-1",
  type: "posting",
  title: "React Developer Needed",
  subtitle: "Building a cool app...",
  skills: ["React", "TypeScript"],
  status: "open",
};

const profileResult: SearchResult = {
  id: "user-1",
  type: "profile",
  title: "Jane Doe",
  subtitle: "Senior Engineer",
  skills: ["Node.js"],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockUseSearch.mockReturnValue({ results: [], isLoading: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Keyboard shortcuts — real logic in the component
  // -----------------------------------------------------------------------

  it("Cmd+K focuses the search input", async () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // setTimeout(focus, 0) in the component — advance timers to trigger it
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(document.activeElement).toBe(input);
  });

  it("Ctrl+K also opens the search (non-Mac)", async () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(document.activeElement).toBe(input);
  });

  it("Escape closes the dropdown and clears the query", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);

    fireEvent.change(input, { target: { value: "React" } });
    expect(screen.getByText("React Developer Needed")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByText("React Developer Needed")).not.toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("");
  });

  // -----------------------------------------------------------------------
  // Debouncing — query is debounced 300ms before reaching useSearch
  // -----------------------------------------------------------------------

  it("debounces the search query by 300ms", async () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);

    await act(async () => {
      fireEvent.change(input, { target: { value: "Re" } });
    });

    // Before 300ms, useSearch should only have been called with "" (initial)
    expect(mockUseSearch).toHaveBeenLastCalledWith("");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // After 300ms the debounced value propagates
    expect(mockUseSearch).toHaveBeenLastCalledWith("Re");
  });

  it("resets debounced query immediately when input is cleared", async () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);

    await act(async () => {
      fireEvent.change(input, { target: { value: "React" } });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(mockUseSearch).toHaveBeenLastCalledWith("React");

    // Clear via the X button (aria-label from labels.nav.clearSearch)
    const clearBtn = screen.getByRole("button", { name: "Clear search" });
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    // Should reset to empty string (queueMicrotask path)
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(mockUseSearch).toHaveBeenLastCalledWith("");
  });

  // -----------------------------------------------------------------------
  // Navigation — selecting results routes correctly
  // -----------------------------------------------------------------------

  it("navigates to /postings/:id when a posting result is clicked", () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "React" } });

    fireEvent.click(screen.getByText("React Developer Needed"));
    expect(mockPush).toHaveBeenCalledWith("/postings/post-1");
  });

  it("navigates to /profile when a profile result is clicked", () => {
    mockUseSearch.mockReturnValue({
      results: [profileResult],
      isLoading: false,
    });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "Jane" } });

    fireEvent.click(screen.getByText("Jane Doe"));
    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  // -----------------------------------------------------------------------
  // Arrow-key navigation and Enter selection
  // -----------------------------------------------------------------------

  it("Enter on a search result navigates without clicking", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);

    // Use a query that won't match any command palette action keywords
    // (avoids actions being injected before search results)
    fireEvent.change(input, { target: { value: "qqq" } });

    await waitFor(() => {
      expect(screen.getByText("React Developer Needed")).toBeInTheDocument();
    });

    // selectedIndex starts at 0 — first item is the posting result (no actions for "qqq")
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/postings/post-1");
  });

  it("ArrowDown does not overshoot past the last result", () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "qqq" } });

    // Press down many times — should clamp at the end
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(input, { key: "ArrowDown" });
    }
    // Press Enter — should still select the only result
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/postings/post-1");
  });

  // -----------------------------------------------------------------------
  // Empty / loading states
  // -----------------------------------------------------------------------

  it("shows no-results message only when query is non-empty and results are empty", () => {
    mockUseSearch.mockReturnValue({ results: [], isLoading: false });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);

    // No query — should not show "No results"
    fireEvent.focus(input);
    expect(screen.queryByText(/No results found/)).not.toBeInTheDocument();

    // With query — shows "No results"
    fireEvent.change(input, { target: { value: "zzzzz" } });
    expect(screen.getByText(/No results found/)).toBeInTheDocument();
  });
});
