"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { labels } from "@/lib/labels";
import type { ProfileFormState } from "@/lib/types/profile";
import type { GeocodingResult } from "@/lib/geocoding";

type ProfileFormGeneralProps = {
  form: ProfileFormState;
  onChange: (field: keyof ProfileFormState, value: string) => void;
  location: {
    isGeolocating: boolean;
    geoError: string | null;
    showAutocomplete: boolean;
    setShowAutocomplete: (show: boolean) => void;
    handleUseCurrentLocation: () => void;
    handleLocationSelect: (result: GeocodingResult) => void;
    handleLocationInputChange: (value: string) => void;
  };
};

export function ProfileFormGeneral({
  form,
  onChange,
  location,
}: ProfileFormGeneralProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            {labels.profileForm.fullNameLabel}
          </label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder={labels.profileForm.fullNamePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="headline" className="text-sm font-medium">
            {labels.profileForm.headlineLabel}
          </label>
          <Input
            id="headline"
            value={form.headline}
            onChange={(e) => onChange("headline", e.target.value)}
            placeholder={labels.profileForm.headlinePlaceholder}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="bio" className="text-sm font-medium">
          {labels.profileForm.bioLabel}
        </label>
        <Textarea
          id="bio"
          rows={4}
          value={form.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder={labels.profileForm.bioPlaceholder}
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
            {labels.profileForm.locationLabel}
          </label>

          {location.showAutocomplete ? (
            <LocationAutocomplete
              value={form.location}
              onSelect={location.handleLocationSelect}
              onChange={location.handleLocationInputChange}
              placeholder={labels.profileForm.locationSearchPlaceholder}
            />
          ) : (
            <Input
              id="location"
              value={form.location}
              onChange={(e) =>
                location.handleLocationInputChange(e.target.value)
              }
              placeholder={labels.profileForm.locationManualPlaceholder}
            />
          )}

          <p className="text-xs text-muted-foreground">
            {labels.profileForm.locationHelp}
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
                {labels.profileForm.gettingLocation}
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                {labels.profileForm.useCurrentLocation}
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
            {location.showAutocomplete
              ? labels.profileForm.manualEntry
              : labels.profileForm.searchLocation}
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
          {labels.profileForm.languagesLabel}
        </label>
        <Input
          id="languages"
          value={form.languages}
          onChange={(e) => onChange("languages", e.target.value)}
          placeholder={labels.profileForm.languagesPlaceholder}
        />
        <p className="text-xs text-muted-foreground">
          {labels.profileForm.languagesHelp}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="interests" className="text-sm font-medium">
            {labels.profileForm.interestsLabel}
          </label>
          <Input
            id="interests"
            value={form.interests}
            onChange={(e) => onChange("interests", e.target.value)}
            placeholder={labels.profileForm.interestsPlaceholder}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="portfolioUrl" className="text-sm font-medium">
            {labels.profileForm.portfolioLabel}
          </label>
          <Input
            id="portfolioUrl"
            value={form.portfolioUrl}
            onChange={(e) => onChange("portfolioUrl", e.target.value)}
            placeholder={labels.profileForm.portfolioPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="githubUrl" className="text-sm font-medium">
            {labels.profileForm.githubLabel}
          </label>
          <Input
            id="githubUrl"
            value={form.githubUrl}
            onChange={(e) => onChange("githubUrl", e.target.value)}
            placeholder={labels.profileForm.githubPlaceholder}
          />
        </div>
      </div>
    </>
  );
}
