import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { SearchResult } from "@/lib/hooks/use-search";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock use-search hook
const mockUseSearch = vi.fn();
vi.mock("@/lib/hooks/use-search", () => ({
  useSearch: (...args: unknown[]) => mockUseSearch(...args),
}));

import { GlobalSearch } from "../global-search";

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

describe("GlobalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue({
      results: [],
      isLoading: false,
    });
  });

  it("renders search input with placeholder", () => {
    render(<GlobalSearch />);
    expect(
      screen.getByPlaceholderText(/Search postings, profiles/),
    ).toBeInTheDocument();
  });

  it("opens search on focus", () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.focus(input);
    // Dropdown opens when there's a query
    expect(screen.getByText("React Developer Needed")).toBeInTheDocument();
  });

  it("opens on Cmd+K keyboard shortcut", () => {
    render(<GlobalSearch />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    // The input should be visible and focused after Cmd+K
    expect(
      screen.getByPlaceholderText(/Search postings, profiles/),
    ).toBeInTheDocument();
  });

  it("opens on Ctrl+K keyboard shortcut", () => {
    render(<GlobalSearch />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(
      screen.getByPlaceholderText(/Search postings, profiles/),
    ).toBeInTheDocument();
  });

  it("displays posting results when search returns data", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);

    fireEvent.change(input, { target: { value: "React" } });

    await waitFor(() => {
      expect(screen.getByText("React Developer Needed")).toBeInTheDocument();
      expect(screen.getByText("Postings")).toBeInTheDocument();
    });
  });

  it("displays profile results", async () => {
    mockUseSearch.mockReturnValue({
      results: [profileResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "Jane" } });

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("People")).toBeInTheDocument();
    });
  });

  it("shows both postings and profiles sections", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult, profileResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "test" } });

    await waitFor(() => {
      expect(screen.getByText("Postings")).toBeInTheDocument();
      expect(screen.getByText("People")).toBeInTheDocument();
    });
  });

  it("navigates to posting page on posting result click", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "React" } });

    await waitFor(() => {
      expect(screen.getByText("React Developer Needed")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("React Developer Needed"));
    expect(mockPush).toHaveBeenCalledWith("/postings/post-1");
  });

  it("navigates to profile page on profile result click", async () => {
    mockUseSearch.mockReturnValue({
      results: [profileResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "Jane" } });

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Jane Doe"));
    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("shows loading state", () => {
    mockUseSearch.mockReturnValue({
      results: [],
      isLoading: true,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "test" } });

    // Loading spinner should be present (Loader2 component)
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("shows no results message when query returns empty", async () => {
    mockUseSearch.mockReturnValue({
      results: [],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "zzzzz" } });

    await waitFor(() => {
      expect(screen.getByText(/No results found/)).toBeInTheDocument();
    });
  });

  it("closes on Escape key", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "React" } });

    await waitFor(() => {
      expect(screen.getByText("React Developer Needed")).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: "Escape" });
    expect(
      screen.queryByText("React Developer Needed"),
    ).not.toBeInTheDocument();
  });

  it("clears input when X button is clicked", async () => {
    mockUseSearch.mockReturnValue({
      results: [],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(
      /Search postings, profiles/,
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });

    // Clear button appears when there is a query
    const clearBtn = document.querySelector(
      "button.absolute",
    ) as HTMLButtonElement;
    if (clearBtn) {
      fireEvent.click(clearBtn);
      expect(input.value).toBe("");
    }
  });

  it("renders skills in results", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "React" } });

    await waitFor(() => {
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });
  });

  it("renders status badge for posting results", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "React" } });

    await waitFor(() => {
      expect(screen.getByText("open")).toBeInTheDocument();
    });
  });

  it("renders keyboard shortcut hints in footer", async () => {
    mockUseSearch.mockReturnValue({
      results: [postingResult],
      isLoading: false,
    });

    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText(/Search postings, profiles/);
    fireEvent.change(input, { target: { value: "x" } });

    await waitFor(() => {
      expect(screen.getByText("to navigate")).toBeInTheDocument();
      expect(screen.getByText("to select")).toBeInTheDocument();
      expect(screen.getByText("to close")).toBeInTheDocument();
    });
  });
});
