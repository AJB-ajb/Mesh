"use client";

import { Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import type { ProfileFormState } from "@/lib/types/profile";
import {
  type SkillLevel,
  type LocationMode,
  type AvailabilitySlots,
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
} from "@/lib/types/profile";
import type { GeocodingResult } from "@/lib/geocoding";

// ---------------------------------------------------------------------------
// Skill level reference labels
// ---------------------------------------------------------------------------

function skillLevelLabel(level: number): string {
  if (level <= 2) return "Beginner";
  if (level <= 4) return "Can follow tutorials";
  if (level <= 6) return "Intermediate";
  if (level <= 8) return "Advanced";
  return "Expert";
}

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
  // --- Skill levels handlers ---
  const addSkill = () => {
    setForm((prev) => ({
      ...prev,
      skillLevels: [...prev.skillLevels, { name: "", level: 5 }],
    }));
  };

  const updateSkill = (index: number, update: Partial<SkillLevel>) => {
    setForm((prev) => ({
      ...prev,
      skillLevels: prev.skillLevels.map((s, i) =>
        i === index ? { ...s, ...update } : s,
      ),
    }));
  };

  const removeSkill = (index: number) => {
    setForm((prev) => ({
      ...prev,
      skillLevels: prev.skillLevels.filter((_, i) => i !== index),
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
      {/* Skill Level Sliders */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Levels</CardTitle>
          <CardDescription>
            Rate your proficiency in each domain on a 0-10 scale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.skillLevels.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No skills added yet. Click below to add your first skill.
            </p>
          )}

          {form.skillLevels.map((skill, index) => (
            <div key={index} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Input
                  value={skill.name}
                  onChange={(e) => updateSkill(index, { name: e.target.value })}
                  placeholder="e.g., Frontend, Python, Design"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSkill(index)}
                  aria-label="Remove skill"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[skill.level]}
                  onValueChange={([val]) => updateSkill(index, { level: val })}
                  className="flex-1"
                />
                <span className="w-20 text-right text-sm font-medium tabular-nums">
                  {skill.level}/10
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {skillLevelLabel(skill.level)}
              </p>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addSkill}>
            <Plus className="mr-2 h-4 w-4" />
            Add skill
          </Button>

          {/* Backward-compat text skills field */}
          <div className="space-y-2 pt-2">
            <label htmlFor="skills" className="text-sm font-medium">
              Skills (comma-separated, for search)
            </label>
            <Input
              id="skills"
              value={form.skills}
              onChange={(e) => onChange("skills", e.target.value)}
              placeholder="e.g., React, TypeScript, Supabase"
            />
            <p className="text-xs text-muted-foreground">
              Used for keyword matching alongside the skill levels above.
            </p>
          </div>
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
