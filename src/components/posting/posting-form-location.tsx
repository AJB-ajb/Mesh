"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { labels } from "@/lib/labels";
import type { PostingFormState } from "@/lib/types/posting";
import type { GeocodingResult } from "@/lib/geocoding";

type PostingFormLocationProps = {
  form: PostingFormState;
  onChange: (field: keyof PostingFormState, value: string) => void;
};

export function PostingFormLocation({
  form,
  onChange,
}: PostingFormLocationProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const showLocation =
    form.locationMode === "in_person" || form.locationMode === "either";
  const showMaxDistance = form.locationMode === "in_person";

  const handleLocationSelect = (result: GeocodingResult) => {
    onChange("locationName", result.displayName);
    onChange("locationLat", result.lat.toString());
    onChange("locationLng", result.lng.toString());
    setShowAutocomplete(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="location-mode" className="text-sm font-medium">
          {labels.postingForm.locationModeLabel}
        </label>
        <select
          id="location-mode"
          value={form.locationMode}
          onChange={(e) => onChange("locationMode", e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="either">
            {labels.postingForm.locationModeOptions.either}
          </option>
          <option value="remote">
            {labels.postingForm.locationModeOptions.remote}
          </option>
          <option value="in_person">
            {labels.postingForm.locationModeOptions.in_person}
          </option>
        </select>
      </div>

      {showLocation && (
        <div className="space-y-2">
          <label htmlFor="location-name" className="text-sm font-medium">
            {labels.postingForm.locationLabel}
          </label>
          {showAutocomplete ? (
            <LocationAutocomplete
              value={form.locationName}
              onSelect={handleLocationSelect}
              onChange={(value) => onChange("locationName", value)}
              placeholder={labels.postingForm.locationSearchPlaceholder}
            />
          ) : (
            <Input
              id="location-name"
              value={form.locationName}
              onChange={(e) => onChange("locationName", e.target.value)}
              placeholder={labels.postingForm.locationPlaceholder}
            />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAutocomplete(!showAutocomplete)}
            >
              {showAutocomplete ? (
                <>
                  <MapPin className="mr-1 h-3 w-3" />
                  {labels.postingForm.manualEntryButton}
                </>
              ) : (
                <>
                  <Search className="mr-1 h-3 w-3" />
                  {labels.postingForm.searchLocationButton}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {showMaxDistance && (
        <div className="space-y-2">
          <label htmlFor="max-distance" className="text-sm font-medium">
            {labels.postingForm.maxDistanceLabel}
          </label>
          <Input
            id="max-distance"
            type="number"
            min={1}
            value={form.maxDistanceKm}
            onChange={(e) => onChange("maxDistanceKm", e.target.value)}
            placeholder={labels.postingForm.maxDistancePlaceholder}
          />
          <p className="text-xs text-muted-foreground">
            {labels.postingForm.maxDistanceHelp}
          </p>
        </div>
      )}
    </div>
  );
}
