import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostingAboutCard } from "../posting-about-card";
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
  selectedSkills: [],
};

describe("PostingAboutCard", () => {
  const onFormChange = vi.fn();

  it("renders the card title", () => {
    render(
      <PostingAboutCard
        posting={basePosting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText("About this posting")).toBeInTheDocument();
  });

  it("renders description in view mode", () => {
    render(
      <PostingAboutCard
        posting={basePosting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(
      screen.getByText("A collaborative coding project"),
    ).toBeInTheDocument();
  });

  it("renders skills as badges in view mode", () => {
    render(
      <PostingAboutCard
        posting={basePosting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("shows 'No specific skills listed' when skills are empty", () => {
    const posting = { ...basePosting, skills: [] };
    render(
      <PostingAboutCard
        posting={posting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText("No specific skills listed")).toBeInTheDocument();
  });

  it("renders team size in view mode", () => {
    render(
      <PostingAboutCard
        posting={basePosting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText(/Min 1 · Looking for 3/)).toBeInTheDocument();
  });

  it("renders team size with different min/max values", () => {
    const posting = { ...basePosting, team_size_min: 2, team_size_max: 5 };
    render(
      <PostingAboutCard
        posting={posting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText(/Min 2 · Looking for 5/)).toBeInTheDocument();
  });

  it("renders estimated time", () => {
    render(
      <PostingAboutCard
        posting={basePosting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText("2 weeks")).toBeInTheDocument();
  });

  it("renders 'Not specified' when estimated_time is empty", () => {
    const posting = { ...basePosting, estimated_time: "" };
    render(
      <PostingAboutCard
        posting={posting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText("Not specified")).toBeInTheDocument();
  });

  it("renders category in view mode", () => {
    render(
      <PostingAboutCard
        posting={basePosting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText("hackathon")).toBeInTheDocument();
  });

  it("renders location mode display for remote", () => {
    render(
      <PostingAboutCard
        posting={basePosting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    // Remote shows house emoji and "Remote" label
    expect(screen.getByText(/🏠/)).toBeInTheDocument();
  });

  it("renders location mode display for in_person", () => {
    const posting = {
      ...basePosting,
      location_mode: "in_person",
      location_name: "Berlin, Germany",
      max_distance_km: 50,
    };
    render(
      <PostingAboutCard
        posting={posting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText(/Berlin, Germany/)).toBeInTheDocument();
    expect(screen.getByText("Within 50 km")).toBeInTheDocument();
  });

  it("renders tags as badges in view mode", () => {
    const posting = {
      ...basePosting,
      tags: ["remote", "weekend", "beginner-friendly"],
    };
    render(
      <PostingAboutCard
        posting={posting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText("#remote")).toBeInTheDocument();
    expect(screen.getByText("#weekend")).toBeInTheDocument();
    expect(screen.getByText("#beginner-friendly")).toBeInTheDocument();
  });

  it("renders context identifier in view mode", () => {
    const posting = { ...basePosting, context_identifier: "CS101" };
    render(
      <PostingAboutCard
        posting={posting}
        isEditing={false}
        form={baseForm}
        onFormChange={onFormChange}
      />,
    );
    expect(screen.getByText("CS101")).toBeInTheDocument();
  });

  // skill_level_min column dropped — now per-skill in posting_skills join table

  it("renders textarea in editing mode", () => {
    render(
      <PostingAboutCard
        posting={basePosting}
        isEditing={true}
        form={{ ...baseForm, description: "Edit me" }}
        onFormChange={onFormChange}
      />,
    );
    const textarea = screen.getByDisplayValue("Edit me");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });
});
