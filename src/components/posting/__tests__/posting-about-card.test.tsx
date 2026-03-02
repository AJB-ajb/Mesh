import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostingAboutCard } from "../posting-about-card";
import { PostingCoreProvider } from "../posting-core-context";
import { PostingEditProvider } from "../posting-edit-context";
import { PostingApplicationProvider } from "../posting-application-context";
import type {
  PostingDetail,
  PostingFormState,
} from "@/lib/hooks/use-posting-detail";
import type { PostingCoreContextValue } from "../posting-core-context";
import type { PostingEditContextValue } from "../posting-edit-context";
import type { PostingApplicationContextValue } from "../posting-application-context";

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
  hiddenDetails: "",
};

const onFormChange = vi.fn();

function makeCoreValue(posting: PostingDetail): PostingCoreContextValue {
  return {
    posting,
    postingId: posting.id,
    isOwner: false,
    currentUserId: "user-2",
    currentUserProfile: null,
    currentUserName: null,
    matchBreakdown: null,
    backHref: "/my-postings",
    backLabel: "Back",
    activeTab: "manage",
    onTabChange: vi.fn(),
    onContactCreator: vi.fn(),
    onStartConversation: vi.fn(),
    error: null,
    isAcceptedMember: false,
    projectEnabled: false,
    acceptedCount: 0,
  };
}

function makeEditValue(
  form: PostingFormState,
  isEditing = false,
): PostingEditContextValue {
  return {
    form,
    onFormChange,
    isEditing,
    isSaving: false,
    isDeleting: false,
    isExtending: false,
    isReposting: false,
    saveStatus: "idle" as const,
    onStartEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onExtendDeadline: vi.fn(),
    onRepost: vi.fn(),
    isApplyingUpdate: false,
    onApplyUpdate: vi.fn(),
    onUndoUpdate: vi.fn(),
  };
}

function makeAppValue(): PostingApplicationContextValue {
  return {
    effectiveApplications: [],
    matchedProfiles: [],
    myApplication: null,
    hasApplied: false,
    waitlistPosition: null,
    showApplyForm: false,
    coverMessage: "",
    isApplying: false,
    onShowApplyForm: vi.fn(),
    onHideApplyForm: vi.fn(),
    onCoverMessageChange: vi.fn(),
    onApply: vi.fn(),
    onWithdraw: vi.fn(),
    isUpdatingApplication: null,
    onUpdateStatus: vi.fn(),
    isLoading: false,
  };
}

function renderWithContext(
  posting: PostingDetail = basePosting,
  form: PostingFormState = baseForm,
  isEditing = false,
) {
  return render(
    <PostingCoreProvider value={makeCoreValue(posting)}>
      <PostingApplicationProvider value={makeAppValue()}>
        <PostingEditProvider value={makeEditValue(form, isEditing)}>
          <PostingAboutCard />
        </PostingEditProvider>
      </PostingApplicationProvider>
    </PostingCoreProvider>,
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
    const posting = { ...basePosting, skills: [] };
    renderWithContext(posting);
    expect(screen.getByText("No specific skills listed")).toBeInTheDocument();
  });

  it("renders team size in view mode", () => {
    renderWithContext();
    expect(screen.getByText(/Min 1 · Looking for 3/)).toBeInTheDocument();
  });

  it("renders team size with different min/max values", () => {
    const posting = { ...basePosting, team_size_min: 2, team_size_max: 5 };
    renderWithContext(posting);
    expect(screen.getByText(/Min 2 · Looking for 5/)).toBeInTheDocument();
  });

  it("renders estimated time", () => {
    renderWithContext();
    expect(screen.getByText("2 weeks")).toBeInTheDocument();
  });

  it("hides estimated time section when estimated_time is empty", () => {
    const posting = { ...basePosting, estimated_time: "" };
    renderWithContext(posting);
    expect(screen.queryByText("Estimated Time")).not.toBeInTheDocument();
  });

  it("renders category in view mode", () => {
    renderWithContext();
    expect(screen.getByText("hackathon")).toBeInTheDocument();
  });

  it("renders location mode display for remote", () => {
    renderWithContext();
    // Remote shows house emoji and "Remote" label
    expect(screen.getByText(/\u{1F3E0}/u)).toBeInTheDocument();
  });

  it("renders location mode display for in_person", () => {
    const posting = {
      ...basePosting,
      location_mode: "in_person",
      location_name: "Berlin, Germany",
      max_distance_km: 50,
    };
    renderWithContext(posting);
    expect(screen.getByText(/Berlin, Germany/)).toBeInTheDocument();
    expect(screen.getByText("Within 50 km")).toBeInTheDocument();
  });

  it("renders tags as badges in view mode", () => {
    const posting = {
      ...basePosting,
      tags: ["remote", "weekend", "beginner-friendly"],
    };
    renderWithContext(posting);
    expect(screen.getByText("#remote")).toBeInTheDocument();
    expect(screen.getByText("#weekend")).toBeInTheDocument();
    expect(screen.getByText("#beginner-friendly")).toBeInTheDocument();
  });

  it("renders context identifier in view mode", () => {
    const posting = { ...basePosting, context_identifier: "CS101" };
    renderWithContext(posting);
    expect(screen.getByText("CS101")).toBeInTheDocument();
  });

  // skill_level_min column dropped -- now per-skill in posting_skills join table

  it("renders textarea in editing mode", () => {
    renderWithContext(
      basePosting,
      { ...baseForm, description: "Edit me" },
      true,
    );
    const textarea = screen.getByDisplayValue("Edit me");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });
});
