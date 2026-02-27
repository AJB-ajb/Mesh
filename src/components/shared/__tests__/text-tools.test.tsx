import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { TextTools } from "../text-tools";

describe("TextTools", () => {
  const onTextChange = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch() {
    return globalThis.fetch as ReturnType<typeof vi.fn>;
  }

  it("renders format and clean buttons", () => {
    render(<TextTools text="some text" onTextChange={onTextChange} />);
    expect(screen.getByText("Auto-format")).toBeInTheDocument();
    expect(screen.getByText("Auto-clean")).toBeInTheDocument();
  });

  it("disables buttons when text is empty", () => {
    render(<TextTools text="" onTextChange={onTextChange} />);
    const formatBtn = screen.getByLabelText("Auto-format");
    const cleanBtn = screen.getByLabelText("Auto-clean");
    expect(formatBtn).toBeDisabled();
    expect(cleanBtn).toBeDisabled();
  });

  it("disables buttons when only whitespace", () => {
    render(<TextTools text="   " onTextChange={onTextChange} />);
    const formatBtn = screen.getByLabelText("Auto-format");
    expect(formatBtn).toBeDisabled();
  });

  it("enables buttons when text is present", () => {
    render(<TextTools text="hello world" onTextChange={onTextChange} />);
    const formatBtn = screen.getByLabelText("Auto-format");
    const cleanBtn = screen.getByLabelText("Auto-clean");
    expect(formatBtn).not.toBeDisabled();
    expect(cleanBtn).not.toBeDisabled();
  });

  it("calls /api/format on format button click", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ formatted: "## Hello\n\nWorld" }),
    });

    render(<TextTools text="Hello World" onTextChange={onTextChange} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Auto-format"));
    });

    expect(mockFetch()).toHaveBeenCalledWith("/api/format", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello World" }),
    });
  });

  it("calls /api/clean on clean button click", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ cleaned: "Hello world." }),
    });

    render(<TextTools text="Helo wrold" onTextChange={onTextChange} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Auto-clean"));
    });

    expect(mockFetch()).toHaveBeenCalledWith("/api/clean", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Helo wrold" }),
    });
  });

  it("shows loading state during format API call", async () => {
    let resolvePromise!: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch().mockReturnValueOnce(fetchPromise);

    render(<TextTools text="Hello World" onTextChange={onTextChange} />);
    fireEvent.click(screen.getByLabelText("Auto-format"));

    await waitFor(() => {
      expect(screen.getByText("Formatting...")).toBeInTheDocument();
    });

    // Resolve to clean up and avoid act warnings
    await act(async () => {
      resolvePromise({
        ok: true,
        json: () => Promise.resolve({ formatted: "Hello World" }),
      });
    });
  });

  it("shows loading state during clean API call", async () => {
    let resolvePromise!: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetch().mockReturnValueOnce(fetchPromise);

    render(<TextTools text="Helo wrold" onTextChange={onTextChange} />);
    fireEvent.click(screen.getByLabelText("Auto-clean"));

    await waitFor(() => {
      expect(screen.getByText("Cleaning...")).toBeInTheDocument();
    });

    await act(async () => {
      resolvePromise({
        ok: true,
        json: () => Promise.resolve({ cleaned: "Helo wrold" }),
      });
    });
  });

  it("opens diff modal on format success", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ formatted: "## Hello\n\nWorld" }),
    });

    render(<TextTools text="Hello World" onTextChange={onTextChange} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Auto-format"));
    });

    await waitFor(() => {
      expect(screen.getByText("Auto-format preview")).toBeInTheDocument();
    });
  });

  it("opens diff modal on clean success", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ cleaned: "Hello world." }),
    });

    render(<TextTools text="Helo wrold" onTextChange={onTextChange} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Auto-clean"));
    });

    await waitFor(() => {
      expect(screen.getByText("Auto-clean preview")).toBeInTheDocument();
    });
  });

  it("calls onTextChange with proposed text on accept", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ formatted: "## Formatted text" }),
    });

    render(<TextTools text="Formatted text" onTextChange={onTextChange} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Auto-format"));
    });

    await waitFor(() => {
      expect(screen.getByText("Auto-format preview")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Accept"));
    expect(onTextChange).toHaveBeenCalledWith("## Formatted text");
  });

  it("shows no-changes message when text is identical", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ formatted: "Hello World" }),
    });

    render(<TextTools text="Hello World" onTextChange={onTextChange} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Auto-format"));
    });

    expect(screen.getByText(/No changes needed/)).toBeInTheDocument();
  });

  it("shows error message on API failure", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { message: "Server error" } }),
    });

    render(<TextTools text="Hello World" onTextChange={onTextChange} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Auto-format"));
    });

    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("shows fallback error message on network failure", async () => {
    mockFetch().mockRejectedValueOnce(new Error("Network error"));

    render(<TextTools text="Hello World" onTextChange={onTextChange} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Auto-format"));
    });

    expect(
      screen.getByText("Failed to format text. Please try again."),
    ).toBeInTheDocument();
  });
});
