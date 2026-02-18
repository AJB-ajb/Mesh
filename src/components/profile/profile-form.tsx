"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { SkillPicker } from "@/components/skill/skill-picker";
import type { ProfileFormState } from "@/lib/types/profile";
import {
  type LocationMode,
  type AvailabilitySlots,
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
} from "@/lib/types/profile";
import type { SelectedProfileSkill } from "@/lib/types/skill";
import type { GeocodingResult } from "@/lib/geocoding";

// ---------------------------------------------------------------------------
// Location mode labels
// ---------------------------------------------------------------------------

const LOCATION_MODE_OPTIONS: { value: LocationMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "in_person", label: "In-person" },
  { value: "either", label: "Flexible" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileForm({
  form,
  setForm,
  isSaving,
  onSubmit,
  onChange,
  onCancel,
  location,
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
}) {
  // --- Selected skills handlers ---
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

  // --- Location mode handler ---
  const setLocationMode = (mode: LocationMode) => {
    setForm((prev) => ({ ...prev, locationMode: mode }));
  };

  // --- Availability slot handler ---
  const toggleSlot = (day: string, slot: string) => {
    setForm((prev) => {
      const current = prev.availabilitySlots[day] ?? [];
      const next = current.includes(slot)
        ? current.filter((s) => s !== slot)
        : [...current, slot];
      const slots: AvailabilitySlots = { ...prev.availabilitySlots };
      if (next.length === 0) {
        delete slots[day];
      } else {
        slots[day] = next;
      }
      return { ...prev, availabilitySlots: slots };
    });
  };

  return (
    <form data-testid="profile-form" onSubmit={onSubmit} className="space-y-6">
      {/* ============================================ */}
      {/* General Information */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Share the essentials about who you are.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => onChange("fullName", e.target.value)}
                placeholder="e.g., Alex Johnson"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="headline" className="text-sm font-medium">
                Headline
              </label>
              <Input
                id="headline"
                value={form.headline}
                onChange={(e) => onChange("headline", e.target.value)}
                placeholder="e.g., Full-stack developer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              About you
            </label>
            <Textarea
              id="bio"
              rows={4}
              value={form.bio}
              onChange={(e) => onChange("bio", e.target.value)}
              placeholder="What do you enjoy building? What makes you unique?"
              enableMic
              onTranscriptionChange={(text) =>
                onChange("bio", form.bio ? form.bio + " " + text : text)
              }
            />
          </div>

          {/* Location Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium">
                Location
              </label>

              {location.showAutocomplete ? (
                <LocationAutocomplete
                  value={form.location}
                  onSelect={location.handleLocationSelect}
                  onChange={location.handleLocationInputChange}
                  placeholder="Search for a location..."
                />
              ) : (
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) =>
                    location.handleLocationInputChange(e.target.value)
                  }
                  placeholder="e.g., Berlin, Germany"
                />
              )}

              <p className="text-xs text-muted-foreground">
                Use the buttons below to auto-fill your location, or type
                manually.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={location.handleUseCurrentLocation}
                disabled={location.isGeolocating}
              >
                {location.isGeolocating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Use current location
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  location.setShowAutocomplete(!location.showAutocomplete)
                }
              >
                <Search className="mr-2 h-4 w-4" />
                {location.showAutocomplete ? "Manual entry" : "Search location"}
              </Button>
            </div>

            {location.geoError && (
              <p className="text-sm text-destructive">{location.geoError}</p>
            )}

            {(form.locationLat || form.locationLng) && (
              <p className="text-xs text-muted-foreground">
                Coordinates: {form.locationLat}, {form.locationLng}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="languages" className="text-sm font-medium">
              Spoken languages (comma-separated)
            </label>
            <Input
              id="languages"
              value={form.languages}
              onChange={(e) => onChange("languages", e.target.value)}
              placeholder="e.g., en, de, es"
            />
            <p className="text-xs text-muted-foreground">
              Use ISO codes: en (English), de (German), es (Spanish), fr
              (French), etc.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="interests" className="text-sm font-medium">
                Interests (comma-separated)
              </label>
              <Input
                id="interests"
                value={form.interests}
                onChange={(e) => onChange("interests", e.target.value)}
                placeholder="e.g., AI, fintech, education"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="portfolioUrl" className="text-sm font-medium">
                Portfolio link
              </label>
              <Input
                id="portfolioUrl"
                value={form.portfolioUrl}
                onChange={(e) => onChange("portfolioUrl", e.target.value)}
                placeholder="https://your-portfolio.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="githubUrl" className="text-sm font-medium">
                GitHub link
              </label>
              <Input
                id="githubUrl"
                value={form.githubUrl}
                onChange={(e) => onChange("githubUrl", e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Skills */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>
            Search or browse the skill tree and rate your proficiency (0-10).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkillPicker
            mode="profile"
            selectedSkills={form.selectedSkills}
            onAdd={handleAddSkill}
            onRemove={handleRemoveSkill}
            onUpdateLevel={handleUpdateSkillLevel}
            placeholder="Search skills (e.g., React, Piano, Photography)..."
          />
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Location Mode Toggle */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>Location Mode</CardTitle>
          <CardDescription>Where do you prefer to collaborate?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {LOCATION_MODE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={
                  form.locationMode === option.value ? "default" : "outline"
                }
                onClick={() => setLocationMode(option.value)}
                className="flex-1"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* Availability Slot Picker */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
          <CardDescription>
            Click cells to toggle when you are typically available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium text-muted-foreground" />
                  {TIME_SLOTS.map((slot) => (
                    <th
                      key={slot}
                      className="p-2 text-center font-medium text-muted-foreground"
                    >
                      {TIME_SLOT_LABELS[slot]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td className="p-2 font-medium">{DAY_LABELS[day]}</td>
                    {TIME_SLOTS.map((slot) => {
                      const active = (
                        form.availabilitySlots[day] ?? []
                      ).includes(slot);
                      return (
                        <td key={slot} className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSlot(day, slot)}
                            className={`h-8 w-full rounded-md border transition-colors ${
                              active
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border bg-background hover:bg-muted"
                            }`}
                            aria-label={`${DAY_LABELS[day]} ${TIME_SLOT_LABELS[slot]}`}
                            aria-pressed={active}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
