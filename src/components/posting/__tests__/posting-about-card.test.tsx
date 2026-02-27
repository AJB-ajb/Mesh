import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostingAboutCard } from "../posting-about-card";
import {
  PostingDetailProvider,
  type PostingDetailContextValue,
} from "../posting-detail-context";
import type {
  PostingDetail,
  PostingFormState,
} from "@/lib/hooks/use-posting-detail";

// Mock LocationAutocomplete since it's not under test
vi.mock("@/components/location/location-autocomplete", () => ({
  LocationAutocomplete: (props: { placeholder?: string }) => (
    <input placeholder={props.placeholder || "location"} />
  ),
}));

const basePosting: PostingDetail = {
  id: "p-1",
  title: "Test Posting",
  description: "A collaborative coding project",
  skills: ["React", "TypeScript"],
  team_size_min: 1,
  team_size_max: 3,
  estimated_time: "2 weeks",
  category: "hackathon",
  visibility: "public",
  mode: "open",
  status: "open",
  created_at: "2025-01-01T00:00:00Z",
  expires_at: "2025-04-01T00:00:00Z",
  creator_id: "user-1",
  location_mode: "remote",
  location_name: null,
  location_lat: null,
  location_lng: null,
  max_distance_km: null,
  auto_accept: false,
};

const baseForm: PostingFormState = {
  title: "",
  description: "",
  skills: "",
  estimatedTime: "",
  teamSizeMin: "1",
  teamSizeMax: "3",
  lookingFor: "3",
  category: "hackathon",
  visibility: "public",
  mode: "open",
  status: "open",
  expiresAt: "2025-04-01",
  locationMode: "remote",
  locationName: "",
  locationLat: "",
  locationLng: "",
  maxDistanceKm: "",
  tags: "",
  contextIdentifier: "",
  skillLevelMin: "",
  autoAccept: "false",
  availabilityMode: "flexible",
  timezone: "",
  availabilityWindows: [],
  specificWindows: [],
  selectedSkills: [],
};

function buildContextValue(
  overrides: Partial<PostingDetailContextValue> = {},
): PostingDetailContextValue {
  return {
    posting: basePosting,
    postingId: "p-1",
    isOwner: false,
    currentUserId: "user-2",
    currentUserName: null,
    currentUserProfile: null,
    matchBreakdown: null,
    effectiveApplications: [],
    matchedProfiles: [],
    hasApplied: false,
    myApplication: null,
    waitlistPosition: null,
    isLoading: false,
    isEditing: false,
    isSaving: false,
    isDeleting: false,
    isExtending: false,
    isReposting: false,
    isApplying: false,
    showApplyForm: false,
    coverMessage: "",
    error: null,
    isUpdatingApplication: null,
    isAcceptedMember: false,
    projectEnabled: false,
    form: baseForm,
    saveStatus: "idle" as const,
    isApplyingUpdate: false,
    activeTab: "manage",
    backHref: "/my-postings",
    backLabel: "Back",
    onFormChange: vi.fn(),
    onSave: vi.fn(),
    onCancelEdit: vi.fn(),
    onStartEdit: vi.fn(),
    onDelete: vi.fn(),
    onExtendDeadline: vi.fn(),
    onRepost: vi.fn(),
    onApply: vi.fn(),
    onWithdraw: vi.fn(),
    onShowApplyForm: vi.fn(),
    onHideApplyForm: vi.fn(),
    onCoverMessageChange: vi.fn(),
    onUpdateStatus: vi.fn(),
    onStartConversation: vi.fn(),
    onContactCreator: vi.fn(),
    onApplyUpdate: vi.fn(),
    onUndoUpdate: vi.fn(),
    onTabChange: vi.fn(),
    ...overrides,
  };
}

function renderWithContext(overrides: Partial<PostingDetailContextValue> = {}) {
  const value = buildContextValue(overrides);
  return render(
    <PostingDetailProvider value={value}>
      <PostingAboutCard />
    </PostingDetailProvider>,
  );
}

describe("PostingAboutCard", () => {
  it("renders the card title", () => {
    renderWithContext();
    expect(screen.getByText("About this posting")).toBeInTheDocument();
  });

  it("renders description in view mode", () => {
    renderWithContext();
    expect(
      screen.getByText("A collaborative coding project"),
    ).toBeInTheDocument();
  });

  it("renders skills as badges in view mode", () => {
    renderWithContext();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("shows 'No specific skills listed' when skills are empty", () => {
    renderWithContext({ posting: { ...basePosting, skills: [] } });
    expect(screen.getByText("No specific skills listed")).toBeInTheDocument();
  });

  it("renders team size in view mode", () => {
    renderWithContext();
    expect(screen.getByText(/Min 1 · Looking for 3/)).toBeInTheDocument();
  });

  it("renders team size with different min/max values", () => {
    renderWithContext({
      posting: { ...basePosting, team_size_min: 2, team_size_max: 5 },
    });
    expect(screen.getByText(/Min 2 · Looking for 5/)).toBeInTheDocument();
  });

  it("renders estimated time", () => {
    renderWithContext();
    expect(screen.getByText("2 weeks")).toBeInTheDocument();
  });

  it("hides estimated time section when estimated_time is empty", () => {
    renderWithContext({
      posting: { ...basePosting, estimated_time: "" },
    });
    expect(screen.queryByText("Estimated Time")).not.toBeInTheDocument();
  });

  it("renders category in view mode", () => {
    renderWithContext();
    expect(screen.getByText("hackathon")).toBeInTheDocument();
  });

  it("renders location mode display for remote", () => {
    renderWithContext();
    // Remote shows house emoji and "Remote" label
    expect(screen.getByText(/🏠/)).toBeInTheDocument();
  });

  it("renders location mode display for in_person", () => {
    renderWithContext({
      posting: {
        ...basePosting,
        location_mode: "in_person",
        location_name: "Berlin, Germany",
        max_distance_km: 50,
      },
    });
    expect(screen.getByText(/Berlin, Germany/)).toBeInTheDocument();
    expect(screen.getByText("Within 50 km")).toBeInTheDocument();
  });

  it("renders tags as badges in view mode", () => {
    renderWithContext({
      posting: {
        ...basePosting,
        tags: ["remote", "weekend", "beginner-friendly"],
      },
    });
    expect(screen.getByText("#remote")).toBeInTheDocument();
    expect(screen.getByText("#weekend")).toBeInTheDocument();
    expect(screen.getByText("#beginner-friendly")).toBeInTheDocument();
  });

  it("renders context identifier in view mode", () => {
    renderWithContext({
      posting: { ...basePosting, context_identifier: "CS101" },
    });
    expect(screen.getByText("CS101")).toBeInTheDocument();
  });

  // skill_level_min column dropped — now per-skill in posting_skills join table

  it("renders textarea in editing mode", () => {
    renderWithContext({
      isEditing: true,
      form: { ...baseForm, description: "Edit me" },
    });
    const textarea = screen.getByDisplayValue("Edit me");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });
});
