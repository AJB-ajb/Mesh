"use client";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import type { LocationMode } from "@/lib/types/profile";

const LOCATION_MODE_OPTIONS: { value: LocationMode; label: string }[] = [
  { value: "remote", label: labels.profileForm.locationModeOptions.remote },
  {
    value: "in_person",
    label: labels.profileForm.locationModeOptions.in_person,
  },
  { value: "either", label: labels.profileForm.locationModeOptions.either },
];

type ProfileFormLocationModeProps = {
  locationMode: LocationMode;
  onSelect: (mode: LocationMode) => void;
};

export function ProfileFormLocationMode({
  locationMode,
  onSelect,
}: ProfileFormLocationModeProps) {
  return (
    <div className="flex gap-2">
      {LOCATION_MODE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={locationMode === option.value ? "default" : "outline"}
          onClick={() => onSelect(option.value)}
          className="flex-1"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
