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

// Mock SkillPicker
vi.mock("@/components/skill/skill-picker", () => ({
  SkillPicker: (props: { placeholder?: string }) => (
    <div data-testid="skill-picker">{props.placeholder}</div>
  ),
}));

function buildForm(
  overrides: Partial<PostingFormState> = {},
): PostingFormState {
  return { ...defaultFormState, ...overrides };
}

describe("PostingFormCard", () => {
  const onChange = vi.fn();
  const onSubmit = vi.fn((e) => e.preventDefault());
  const setForm = vi.fn();

  const renderCard = (formOverrides: Partial<PostingFormState> = {}) =>
    render(
      <PostingFormCard
        form={buildForm(formOverrides)}
        setForm={setForm}
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

  it("renders skill picker", () => {
    renderCard();
    expect(screen.getByTestId("skill-picker")).toBeInTheDocument();
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

  it("renders Required Skills label", () => {
    renderCard();
    expect(screen.getByText("Required Skills")).toBeInTheDocument();
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

  it("renders visibility toggle", () => {
    renderCard();
    expect(screen.getByText("Visibility")).toBeInTheDocument();
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
        setForm={setForm}
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
        setForm={setForm}
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
        setForm={setForm}
        onChange={onChange}
        onSubmit={onSubmit}
        isSaving={false}
        isExtracting={true}
      />,
    );
    const submitBtn = screen.getByText("Create Posting").closest("button");
    expect(submitBtn).toBeDisabled();
  });

  it("renders Cancel link to /my-postings", () => {
    renderCard();
    const cancelLink = screen.getByText("Cancel");
    expect(cancelLink.closest("a")).toHaveAttribute("href", "/my-postings");
  });

  it("calls onSubmit when form is submitted", () => {
    renderCard();
    const form = screen.getByText("Create Posting").closest("form");
    if (form) fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("renders tags input", () => {
    renderCard({ tags: "remote, weekend" });
    expect(screen.getByDisplayValue("remote, weekend")).toBeInTheDocument();
  });

  it("calls onChange when tags changes", () => {
    renderCard();
    const input = screen.getByLabelText("Tags (comma-separated)");
    fireEvent.change(input, { target: { value: "beginner-friendly" } });
    expect(onChange).toHaveBeenCalledWith("tags", "beginner-friendly");
  });

  it("renders context identifier input", () => {
    renderCard({ contextIdentifier: "CS101" });
    expect(screen.getByDisplayValue("CS101")).toBeInTheDocument();
  });

  it("calls onChange when context identifier changes", () => {
    renderCard();
    const input = screen.getByLabelText("Context (optional)");
    fireEvent.change(input, { target: { value: "HackMIT 2026" } });
    expect(onChange).toHaveBeenCalledWith("contextIdentifier", "HackMIT 2026");
  });

  it("renders the skill picker for posting mode", () => {
    renderCard();
    expect(screen.getByTestId("skill-picker")).toBeInTheDocument();
  });
});
