"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";
import type { ProfileFormState } from "@/lib/types/profile";
import { type LocationMode } from "@/lib/types/profile";
import type { RecurringWindow } from "@/lib/types/availability";
import type { SelectedProfileSkill } from "@/lib/types/skill";
import type { GeocodingResult } from "@/lib/geocoding";

import { ProfileFormGeneral } from "./profile-form-general";
import { ProfileFormSkills } from "./profile-form-skills";
import { ProfileFormLocationMode } from "./profile-form-location-mode";
import { AvailabilityEditor } from "@/components/availability/availability-editor";

export function ProfileForm({
  form,
  setForm,
  isSaving,
  onSubmit,
  onChange,
  onCancel,
  location,
  availabilityWindows,
  onAvailabilityWindowsChange,
  busyBlocks,
}: {
  form: ProfileFormState;
  setForm: React.Dispatch<React.SetStateAction<ProfileFormState>>;
  isSaving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof ProfileFormState, value: string) => void;
  onCancel: () => void;
  location: {
    isGeolocating: boolean;
    geoError: string | null;
    showAutocomplete: boolean;
    setShowAutocomplete: (show: boolean) => void;
    handleUseCurrentLocation: () => void;
    handleLocationSelect: (result: GeocodingResult) => void;
    handleLocationInputChange: (value: string) => void;
  };
  availabilityWindows: RecurringWindow[];
  onAvailabilityWindowsChange: (windows: RecurringWindow[]) => void;
  busyBlocks?: RecurringWindow[];
}) {
  const handleAddSkill = (skill: SelectedProfileSkill) => {
    setForm((prev) => ({
      ...prev,
      selectedSkills: [...prev.selectedSkills, skill],
    }));
  };

  const handleRemoveSkill = (skillId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.filter((s) => s.skillId !== skillId),
    }));
  };

  const handleUpdateSkillLevel = (skillId: string, level: number) => {
    setForm((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.map((s) =>
        s.skillId === skillId ? { ...s, level } : s,
      ),
    }));
  };

  const setLocationMode = (mode: LocationMode) => {
    setForm((prev) => ({ ...prev, locationMode: mode }));
  };

  return (
    <form data-testid="profile-form" onSubmit={onSubmit} className="space-y-6">
      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.profileForm.generalInfoTitle}</CardTitle>
          <CardDescription>
            {labels.profileForm.generalInfoDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProfileFormGeneral
            form={form}
            onChange={onChange}
            location={location}
          />
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.profileForm.skillsTitle}</CardTitle>
          <CardDescription>
            {labels.profileForm.skillsDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileFormSkills
            selectedSkills={form.selectedSkills}
            onAdd={handleAddSkill}
            onRemove={handleRemoveSkill}
            onUpdateLevel={handleUpdateSkillLevel}
          />
        </CardContent>
      </Card>

      {/* Location Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.profileForm.locationModeTitle}</CardTitle>
          <CardDescription>
            {labels.profileForm.locationModeDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileFormLocationMode
            locationMode={form.locationMode}
            onSelect={setLocationMode}
          />
        </CardContent>
      </Card>

      {/* Availability Editor (Quick/Detailed) */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.profileForm.availabilityTitle}</CardTitle>
          <CardDescription>
            {labels.profileForm.availabilityDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor
            windows={availabilityWindows}
            onChange={onAvailabilityWindowsChange}
            busyBlocks={busyBlocks}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? labels.common.saving : labels.common.saveChanges}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {labels.common.cancel}
        </Button>
      </div>
    </form>
  );
}
