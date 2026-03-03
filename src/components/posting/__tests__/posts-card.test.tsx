import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostsCard } from "../posts-card";
import type { PostsCardData } from "@/lib/hooks/use-posts-page";

// Mock MarkdownRenderer to render plain text
vi.mock("@/components/shared/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <p>{content}</p>,
}));

// Mock format module to return stable output
vi.mock("@/lib/format", () => ({
  formatDateAgo: () => "3 days ago",
  stripTitleMarkdown: (title: string | null | undefined) => title ?? "",
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const baseItem: PostsCardData = {
  id: "p-1",
  title: "Test Posting",
  description: "A test description",
  status: "open",
  category: "hackathon",
  teamSizeMin: 2,
  teamSizeMax: 5,
  createdAt: "2025-01-01T00:00:00Z",
  creatorId: "user-1",
  role: "owner",
  href: "/postings/p-1",
};

describe("PostsCard", () => {
  it("renders the title", () => {
    render(<PostsCard item={baseItem} />);
    expect(screen.getByText("Test Posting")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<PostsCard item={baseItem} />);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders 'You created' role badge for owner", () => {
    render(<PostsCard item={baseItem} />);
    expect(screen.getByText("You created")).toBeInTheDocument();
  });

  it("renders 'You joined' role badge for joined", () => {
    render(<PostsCard item={{ ...baseItem, role: "joined" }} />);
    expect(screen.getByText("You joined")).toBeInTheDocument();
  });

  it("shows edit button only for owner", () => {
    render(<PostsCard item={baseItem} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("hides edit button for joined role", () => {
    render(<PostsCard item={{ ...baseItem, role: "joined" }} />);
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
  });

  it("shows unread count for joined posts with unread messages", () => {
    render(
      <PostsCard item={{ ...baseItem, role: "joined", unreadCount: 3 }} />,
    );
    expect(screen.getByText(/3 unread messages/)).toBeInTheDocument();
  });

  it("hides unread count when zero", () => {
    render(
      <PostsCard item={{ ...baseItem, role: "joined", unreadCount: 0 }} />,
    );
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });

  it("links to the correct href", () => {
    render(<PostsCard item={baseItem} />);
    const link = screen.getByRole("link", { name: /Test Posting/ });
    expect(link).toHaveAttribute("href", "/postings/p-1");
  });

  it("renders category badge", () => {
    render(<PostsCard item={baseItem} />);
    expect(screen.getByText("hackathon")).toBeInTheDocument();
  });

  it("hides category badge when null", () => {
    render(<PostsCard item={{ ...baseItem, category: null }} />);
    expect(screen.queryByText("hackathon")).not.toBeInTheDocument();
  });

  it("renders team size range", () => {
    render(<PostsCard item={baseItem} />);
    expect(screen.getByText("2–5")).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(<PostsCard item={baseItem} />);
    expect(screen.getByText("3 days ago")).toBeInTheDocument();
  });
});
