import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PostingFormCard,
  defaultFormState,
  type PostingFormState,
} from "../posting-form-card";

// Mock LocationAutocomplete
vi.mock("@/components/location/location-autocomplete", () => ({
  LocationAutocomplete: (props: { placeholder?: string }) => (
    <input
      data-testid="location-autocomplete"
      placeholder={props.placeholder}
    />
  ),
}));

// Mock SpeechInput
vi.mock("@/components/ai-elements/speech-input", () => ({
  SpeechInput: () => <button data-testid="speech-input">Speech</button>,
}));

// Mock transcribeAudio
vi.mock("@/lib/transcribe", () => ({
  transcribeAudio: vi.fn(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

function buildForm(
  overrides: Partial<PostingFormState> = {},
): PostingFormState {
  return { ...defaultFormState, ...overrides };
}

describe("PostingFormCard", () => {
  const onChange = vi.fn();
  const onSubmit = vi.fn((e) => e.preventDefault());

  const renderCard = (formOverrides: Partial<PostingFormState> = {}) =>
    render(
      <PostingFormCard
        form={buildForm(formOverrides)}
        onChange={onChange}
        onSubmit={onSubmit}
        isSaving={false}
        isExtracting={false}
      />,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders card title", () => {
    renderCard();
    expect(screen.getByText("Posting Details")).toBeInTheDocument();
  });

  it("renders title input", () => {
    renderCard({ title: "My Project" });
    expect(screen.getByDisplayValue("My Project")).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    renderCard({ description: "Building something cool" });
    expect(
      screen.getByDisplayValue("Building something cool"),
    ).toBeInTheDocument();
  });

  it("renders skills input", () => {
    renderCard({ skills: "React, TypeScript" });
    expect(screen.getByDisplayValue("React, TypeScript")).toBeInTheDocument();
  });

  it("calls onChange when title changes", () => {
    renderCard();
    const input = screen.getByLabelText("Posting Title");
    fireEvent.change(input, { target: { value: "New Title" } });
    expect(onChange).toHaveBeenCalledWith("title", "New Title");
  });

  it("calls onChange when description changes", () => {
    renderCard();
    const textarea = screen.getByLabelText(/Description/);
    fireEvent.change(textarea, { target: { value: "New desc" } });
    expect(onChange).toHaveBeenCalledWith("description", "New desc");
  });

  it("calls onChange when skills changes", () => {
    renderCard();
    const input = screen.getByLabelText("Skills (comma-separated)");
    fireEvent.change(input, { target: { value: "Go, Rust" } });
    expect(onChange).toHaveBeenCalledWith("skills", "Go, Rust");
  });

  it("renders category selector", () => {
    renderCard();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    // Check options
    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(select.value).toBe("personal");
  });

  it("calls onChange when category changes", () => {
    renderCard();
    const select = screen.getByLabelText("Category");
    fireEvent.change(select, { target: { value: "hackathon" } });
    expect(onChange).toHaveBeenCalledWith("category", "hackathon");
  });

  it("renders estimated time input", () => {
    renderCard({ estimatedTime: "2 weeks" });
    expect(screen.getByDisplayValue("2 weeks")).toBeInTheDocument();
  });

  it("renders looking for input", () => {
    renderCard({ lookingFor: "5" });
    expect(screen.getByDisplayValue("5")).toBeInTheDocument();
  });

  it("renders mode selector", () => {
    renderCard();
    expect(screen.getByLabelText("Mode")).toBeInTheDocument();
  });

  it("renders expires on date input", () => {
    renderCard();
    expect(screen.getByLabelText("Expires on")).toBeInTheDocument();
  });

  it("renders location mode selector", () => {
    renderCard();
    expect(screen.getByLabelText("Location Mode")).toBeInTheDocument();
  });

  it("shows Create Posting button", () => {
    renderCard();
    expect(screen.getByText("Create Posting")).toBeInTheDocument();
  });

  it("shows Creating... when saving", () => {
    render(
      <PostingFormCard
        form={buildForm()}
        onChange={onChange}
        onSubmit={onSubmit}
        isSaving={true}
        isExtracting={false}
      />,
    );
    expect(screen.getByText("Creating...")).toBeInTheDocument();
  });

  it("disables submit when saving", () => {
    render(
      <PostingFormCard
        form={buildForm()}
        onChange={onChange}
        onSubmit={onSubmit}
        isSaving={true}
        isExtracting={false}
      />,
    );
    const submitBtn = screen.getByText("Creating...").closest("button");
    expect(submitBtn).toBeDisabled();
  });

  it("disables submit when extracting", () => {
    render(
      <PostingFormCard
        form={buildForm()}
        onChange={onChange}
        onSubmit={onSubmit}
        isSaving={false}
        isExtracting={true}
      />,
    );
    const submitBtn = screen.getByText("Create Posting").closest("button");
    expect(submitBtn).toBeDisabled();
  });

  it("renders Cancel link to /postings", () => {
    renderCard();
    const cancelLink = screen.getByText("Cancel");
    expect(cancelLink.closest("a")).toHaveAttribute("href", "/postings");
  });

  it("calls onSubmit when form is submitted", () => {
    renderCard();
    const form = screen.getByText("Create Posting").closest("form");
    if (form) fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalled();
  });
});
