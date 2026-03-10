import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnifiedPostingCard } from "../unified-posting-card";

// Mock MarkdownRenderer to render plain text
vi.mock("@/components/shared/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <p>{content}</p>,
}));

// Mock format module to return stable output
vi.mock("@/lib/format", () => ({
  formatDateAgo: () => "3 days ago",
  stripTitleMarkdown: (title: string | null | undefined) => title ?? "",
  getInitials: (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  },
  extractTitleFromDescription: (desc: string) => {
    if (!desc) return "";
    return desc.split(/\n/)[0].trim().split(/[.!?]/)[0].trim().slice(0, 100);
  },
}));

// Mock scoring
vi.mock("@/lib/matching/scoring", () => ({
  formatScore: (score: number) => `${Math.round(score * 100)}%`,
}));

// Mock location
vi.mock("@/lib/posting/location", () => ({
  getLocationLabel: (mode: string | null, name: string | null) => {
    if (mode === "remote") return "Remote";
    if (mode === "in_person") return name ?? "In-person";
    return null;
  },
}));

// Mock styles
vi.mock("@/lib/posting/styles", () => ({
  categoryStyles: { hackathon: "bg-purple-500" },
  getStatusColor: (status: string) =>
    status === "open"
      ? "bg-green-500/10 text-green-600"
      : "bg-muted text-muted-foreground",
}));

// Mock next/navigation
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// ---------------------------------------------------------------------------
// Base props fixtures
// ---------------------------------------------------------------------------

const fullBaseProps = {
  variant: "full" as const,
  id: "disc-1",
  title: "Hackathon Project",
  description: "Building something cool together",
  status: "open",
  category: "hackathon" as string | null,
  createdAt: "2025-01-01T00:00:00Z",
  creatorId: "user-creator",
  creator: { name: "Jane Doe", userId: "user-creator" },
  skills: ["React", "TypeScript"],
  tags: ["ai", "web"],
  teamSizeMin: 2,
  teamSizeMax: 5,
  estimatedTime: "2 weeks",
  locationMode: "remote",
  locationName: null as string | null,
  visibility: "public",
  mode: "open",
  contextIdentifier: null as string | null,
  compatibilityScore: 0.85,
  scoreBreakdown: {
    semantic: 0.9,
    availability: 0.8,
    skill_level: 0.85,
    location: 0.75,
  },
  isOwner: false,
};

const compactBaseProps = {
  variant: "compact" as const,
  id: "post-1",
  title: "Study Group",
  description: "Weekly study sessions",
  status: "open",
  category: "study" as string | null,
  createdAt: "2025-01-01T00:00:00Z",
  creatorId: "user-1",
  teamSizeMin: 2,
  teamSizeMax: 4,
  role: "owner" as const,
  href: "/postings/post-1",
};

// ---------------------------------------------------------------------------
// Tests -- Full variant (discover)
// ---------------------------------------------------------------------------

describe("UnifiedPostingCard -- full variant", () => {
  it("renders title and description", () => {
    render(<UnifiedPostingCard {...fullBaseProps} />);
    expect(screen.getByText("Hackathon Project")).toBeInTheDocument();
    expect(
      screen.getByText("Building something cool together"),
    ).toBeInTheDocument();
  });

  it("renders match score badge for non-owners", () => {
    render(<UnifiedPostingCard {...fullBaseProps} />);
    // Score badge text: "85% match"
    expect(screen.getAllByText("85% match").length).toBeGreaterThanOrEqual(1);
  });

  it("hides match score badge for owners", () => {
    render(<UnifiedPostingCard {...fullBaseProps} isOwner={true} />);
    expect(screen.queryByText("85% match")).not.toBeInTheDocument();
  });

  it("shows 'Posted by you' for owner", () => {
    render(<UnifiedPostingCard {...fullBaseProps} isOwner={true} />);
    expect(screen.getByText(/Posted by you/)).toBeInTheDocument();
  });

  it("shows creator name for non-owner", () => {
    render(<UnifiedPostingCard {...fullBaseProps} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders bookmark button and calls callback", () => {
    const onToggleBookmark = vi.fn();
    render(
      <UnifiedPostingCard
        {...fullBaseProps}
        onToggleBookmark={onToggleBookmark}
      />,
    );
    const bookmarkBtn = screen.getByRole("button", { name: "Bookmark" });
    fireEvent.click(bookmarkBtn);
    expect(onToggleBookmark).toHaveBeenCalledWith("disc-1");
  });

  it("renders meta line with team size, time, and location", () => {
    render(<UnifiedPostingCard {...fullBaseProps} />);
    expect(screen.getByText(/Looking for 5/)).toBeInTheDocument();
    expect(screen.getByText("2 weeks")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
  });

  it("renders interest button when showInterestButton is true", () => {
    render(
      <UnifiedPostingCard
        {...fullBaseProps}
        showInterestButton={true}
        onExpressInterest={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Request to join/ }),
    ).toBeInTheDocument();
  });

  it("renders compatibility breakdown collapsible", () => {
    render(<UnifiedPostingCard {...fullBaseProps} />);
    // Initially collapsed -- "Show breakdown" visible
    expect(screen.getByText("Show breakdown")).toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText("Show breakdown"));
    expect(screen.getByText("Relevance")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("does not crash with missing optional props", () => {
    render(
      <UnifiedPostingCard
        variant="full"
        id="min-1"
        title="Minimal"
        description="Just a description"
        status="open"
        category={null}
        createdAt="2025-01-01T00:00:00Z"
        creatorId="user-1"
      />,
    );
    expect(screen.getByText("Minimal")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Tests -- Compact variant (posts)
// ---------------------------------------------------------------------------

describe("UnifiedPostingCard -- compact variant", () => {
  it("renders title and description", () => {
    render(<UnifiedPostingCard {...compactBaseProps} />);
    expect(screen.getByText("Study Group")).toBeInTheDocument();
    expect(screen.getByText("Weekly study sessions")).toBeInTheDocument();
  });

  it("renders role badge -- Created for owner", () => {
    render(<UnifiedPostingCard {...compactBaseProps} />);
    expect(screen.getByText("You created")).toBeInTheDocument();
  });

  it("renders role badge -- Joined for joined", () => {
    render(<UnifiedPostingCard {...compactBaseProps} role="joined" />);
    expect(screen.getByText("You joined")).toBeInTheDocument();
  });

  it("shows status badge", () => {
    render(<UnifiedPostingCard {...compactBaseProps} />);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("shows unread count for joined posts", () => {
    render(
      <UnifiedPostingCard
        {...compactBaseProps}
        role="joined"
        unreadCount={3}
      />,
    );
    expect(screen.getByText(/3 unread messages/)).toBeInTheDocument();
  });

  it("hides unread count when zero", () => {
    render(
      <UnifiedPostingCard
        {...compactBaseProps}
        role="joined"
        unreadCount={0}
      />,
    );
    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });

  it("links to the correct href", () => {
    render(<UnifiedPostingCard {...compactBaseProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/postings/post-1");
  });

  it("renders team size range", () => {
    render(<UnifiedPostingCard {...compactBaseProps} />);
    expect(screen.getByText("2\u20134")).toBeInTheDocument();
  });

  it("renders formatted date", () => {
    render(<UnifiedPostingCard {...compactBaseProps} />);
    expect(screen.getByText("3 days ago")).toBeInTheDocument();
  });

  it("'More details' expands and collapses", () => {
    render(
      <UnifiedPostingCard
        {...compactBaseProps}
        skills={["React"]}
        tags={["web"]}
      />,
    );

    // Initially collapsed
    expect(screen.getByText("More details")).toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();

    // Expand
    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("#web")).toBeInTheDocument();
    expect(screen.getByText("Less details")).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByText("Less details"));
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });

  it("does not crash with missing optional props", () => {
    render(
      <UnifiedPostingCard
        variant="compact"
        id="min-2"
        title="Minimal Compact"
        description="Just minimal"
        status="open"
        category={null}
        createdAt="2025-01-01T00:00:00Z"
        creatorId="user-1"
        role="owner"
        href="/postings/min-2"
      />,
    );
    expect(screen.getByText("Minimal Compact")).toBeInTheDocument();
  });
});
