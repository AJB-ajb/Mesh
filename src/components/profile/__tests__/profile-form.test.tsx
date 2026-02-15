import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileForm } from "../profile-form";
import type { ProfileFormState } from "@/lib/types/profile";
import { defaultFormState } from "@/lib/types/profile";

// Mock ResizeObserver (needed by Radix Slider)
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock LocationAutocomplete
vi.mock("@/components/location/location-autocomplete", () => ({
  LocationAutocomplete: (props: { placeholder?: string }) => (
    <input
      data-testid="location-autocomplete"
      placeholder={props.placeholder}
    />
  ),
}));

// Mock Slider to avoid ResizeObserver complexities
vi.mock("@/components/ui/slider", () => ({
  Slider: (props: {
    value?: number[];
    onValueChange?: (v: number[]) => void;
  }) => (
    <input
      type="range"
      value={props.value?.[0] ?? 5}
      onChange={(e) => props.onValueChange?.([Number(e.target.value)])}
      data-testid="slider"
    />
  ),
}));

function buildForm(
  overrides: Partial<ProfileFormState> = {},
): ProfileFormState {
  return { ...defaultFormState, ...overrides };
}

function buildLocationProps(overrides: Record<string, unknown> = {}) {
  return {
    isGeolocating: false,
    geoError: null,
    showAutocomplete: false,
    setShowAutocomplete: vi.fn(),
    handleUseCurrentLocation: vi.fn(),
    handleLocationSelect: vi.fn(),
    handleLocationInputChange: vi.fn(),
    ...overrides,
  };
}

describe("ProfileForm", () => {
  const setForm = vi.fn();
  const onSubmit = vi.fn((e) => e.preventDefault());
  const onChange = vi.fn();
  const onCancel = vi.fn();

  const renderForm = (
    formOverrides: Partial<ProfileFormState> = {},
    locationOverrides: Record<string, unknown> = {},
  ) =>
    render(
      <ProfileForm
        form={buildForm(formOverrides)}
        setForm={setForm}
        isSaving={false}
        onSubmit={onSubmit}
        onChange={onChange}
        onCancel={onCancel}
        location={buildLocationProps(locationOverrides)}
      />,
    );

  it("renders the form element", () => {
    renderForm();
    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
  });

  it("renders General Information section", () => {
    renderForm();
    expect(screen.getByText("General Information")).toBeInTheDocument();
  });

  it("renders Skill Levels section", () => {
    renderForm();
    expect(screen.getByText("Skill Levels")).toBeInTheDocument();
  });

  it("renders Location Mode section", () => {
    renderForm();
    expect(screen.getByText("Location Mode")).toBeInTheDocument();
  });

  it("renders Availability section", () => {
    renderForm();
    expect(screen.getByText("Availability")).toBeInTheDocument();
  });

  it("renders full name input with value", () => {
    renderForm({ fullName: "John Doe" });
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
  });

  it("renders headline input with value", () => {
    renderForm({ headline: "React Developer" });
    expect(screen.getByDisplayValue("React Developer")).toBeInTheDocument();
  });

  it("renders bio textarea with value", () => {
    renderForm({ bio: "I love building things" });
    expect(
      screen.getByDisplayValue("I love building things"),
    ).toBeInTheDocument();
  });

  it("calls onChange when full name changes", () => {
    renderForm();
    const input = screen.getByLabelText("Full name");
    fireEvent.change(input, { target: { value: "New Name" } });
    expect(onChange).toHaveBeenCalledWith("fullName", "New Name");
  });

  it("calls onChange when headline changes", () => {
    renderForm();
    const input = screen.getByLabelText("Headline");
    fireEvent.change(input, { target: { value: "New Headline" } });
    expect(onChange).toHaveBeenCalledWith("headline", "New Headline");
  });

  it("renders empty skills message when no skills", () => {
    renderForm({ skillLevels: [] });
    expect(screen.getByText(/No skills added yet/)).toBeInTheDocument();
  });

  it("renders skill entries when present", () => {
    renderForm({
      skillLevels: [
        { name: "React", level: 7 },
        { name: "Python", level: 4 },
      ],
    });
    expect(screen.getByDisplayValue("React")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Python")).toBeInTheDocument();
  });

  it("calls setForm when Add skill is clicked", () => {
    renderForm();
    fireEvent.click(screen.getByText("Add skill"));
    expect(setForm).toHaveBeenCalled();
  });

  it("renders location mode buttons", () => {
    renderForm();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("In-person")).toBeInTheDocument();
    expect(screen.getByText("Flexible")).toBeInTheDocument();
  });

  it("renders Use current location button", () => {
    renderForm();
    expect(screen.getByText("Use current location")).toBeInTheDocument();
  });

  it("shows Saving... text when isSaving is true", () => {
    render(
      <ProfileForm
        form={buildForm()}
        setForm={setForm}
        isSaving={true}
        onSubmit={onSubmit}
        onChange={onChange}
        onCancel={onCancel}
        location={buildLocationProps()}
      />,
    );
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("renders Save changes button when not saving", () => {
    renderForm();
    expect(screen.getByText("Save changes")).toBeInTheDocument();
  });

  it("renders Cancel button", () => {
    renderForm();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    renderForm();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onSubmit when form is submitted", () => {
    renderForm();
    fireEvent.submit(screen.getByTestId("profile-form"));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("renders LocationAutocomplete when showAutocomplete is true", () => {
    renderForm({}, { showAutocomplete: true });
    expect(screen.getByTestId("location-autocomplete")).toBeInTheDocument();
  });

  it("shows geoError when present", () => {
    renderForm({}, { geoError: "Location not available" });
    expect(screen.getByText("Location not available")).toBeInTheDocument();
  });
});
