"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import type { ProfileFormState } from "@/lib/types/profile";
import type { GeocodingResult } from "@/lib/geocoding";

export function ProfileForm({
  form,
  isSaving,
  onSubmit,
  onChange,
  onCancel,
  location,
}: {
  form: ProfileFormState;
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
  return (
    <form data-testid="profile-form" onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Share the essentials about who you are and how you like to work.
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
            <textarea
              id="bio"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.bio}
              onChange={(e) => onChange("bio", e.target.value)}
              placeholder="What do you enjoy building? What makes you unique?"
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
                {location.showAutocomplete
                  ? "Manual entry"
                  : "Search location"}
              </Button>
            </div>

            {location.geoError && (
              <p className="text-sm text-destructive">{location.geoError}</p>
            )}

            {(form.locationLat || form.locationLng) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Latitude
                  </label>
                  <Input
                    value={form.locationLat}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    placeholder="Auto-filled"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Longitude
                  </label>
                  <Input
                    value={form.locationLng}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    placeholder="Auto-filled"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <label htmlFor="availabilityHours" className="text-sm font-medium">
              Availability (hrs/week)
            </label>
            <Input
              id="availabilityHours"
              value={form.availabilityHours}
              onChange={(e) => onChange("availabilityHours", e.target.value)}
              placeholder="e.g., 10"
            />
            <p className="text-xs text-muted-foreground">
              Your actual weekly availability for projects. This is used for
              matching with project requirements.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="remotePreference" className="text-sm font-medium">
              Remote preference: {form.remotePreference}%
            </label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">On-site</span>
              <input
                id="remotePreference"
                type="range"
                min="0"
                max="100"
                value={form.remotePreference}
                onChange={(e) => onChange("remotePreference", e.target.value)}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">Remote</span>
            </div>
            <p className="text-xs text-muted-foreground">
              0% = prefer fully on-site, 100% = prefer fully remote
            </p>
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
              <label htmlFor="experienceLevel" className="text-sm font-medium">
                Experience level
              </label>
              <select
                id="experienceLevel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.experienceLevel}
                onChange={(e) => onChange("experienceLevel", e.target.value)}
              >
                <option value="junior">Junior</option>
                <option value="intermediate">Intermediate</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="collaborationStyle"
                className="text-sm font-medium"
              >
                Collaboration style
              </label>
              <select
                id="collaborationStyle"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.collaborationStyle}
                onChange={(e) => onChange("collaborationStyle", e.target.value)}
              >
                <option value="async">Mostly async</option>
                <option value="sync">Mostly sync</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="skills" className="text-sm font-medium">
                Skills (comma-separated)
              </label>
              <Input
                id="skills"
                value={form.skills}
                onChange={(e) => onChange("skills", e.target.value)}
                placeholder="e.g., React, TypeScript, Supabase"
              />
            </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Project Preferences</CardTitle>
          <CardDescription>
            Tell us what kinds of projects youre excited to join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> &quot;Preferred project commitment&quot; is
              different from &quot;Availability&quot; above. Availability is your
              actual weekly hours available, while preferred commitment is the
              project commitment level you&apos;re looking for. Make sure both
              are set for accurate matching.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="projectTypes" className="text-sm font-medium">
                Project types (comma-separated)
              </label>
              <Input
                id="projectTypes"
                value={form.projectTypes}
                onChange={(e) => onChange("projectTypes", e.target.value)}
                placeholder="e.g., SaaS, hackathon, open source"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="preferredRoles" className="text-sm font-medium">
                Preferred roles (comma-separated)
              </label>
              <Input
                id="preferredRoles"
                value={form.preferredRoles}
                onChange={(e) => onChange("preferredRoles", e.target.value)}
                placeholder="e.g., Frontend, Backend, PM"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="preferredStack" className="text-sm font-medium">
              Preferred tech stack (comma-separated)
            </label>
            <Input
              id="preferredStack"
              value={form.preferredStack}
              onChange={(e) => onChange("preferredStack", e.target.value)}
              placeholder="e.g., React, Node, Postgres"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="commitmentLevel" className="text-sm font-medium">
                Preferred project commitment
              </label>
              <select
                id="commitmentLevel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.commitmentLevel}
                onChange={(e) => onChange("commitmentLevel", e.target.value)}
              >
                <option value="5">5 hrs/week</option>
                <option value="10">10 hrs/week</option>
                <option value="15">15 hrs/week</option>
                <option value="20">20+ hrs/week</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Your preferred project commitment level. This helps match you
                with projects that fit your desired time investment.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="timelinePreference"
                className="text-sm font-medium"
              >
                Timeline preference
              </label>
              <select
                id="timelinePreference"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.timelinePreference}
                onChange={(e) => onChange("timelinePreference", e.target.value)}
              >
                <option value="weekend">This weekend</option>
                <option value="1_week">1 week</option>
                <option value="1_month">1 month</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match Filters</CardTitle>
          <CardDescription>
            Set preferences for which projects rank higher in your matches.
            Projects outside these preferences will still appear but with lower
            scores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="filterMaxDistance"
                className="text-sm font-medium"
              >
                Max distance (km)
              </label>
              <Input
                id="filterMaxDistance"
                type="number"
                min="0"
                value={form.filterMaxDistance}
                onChange={(e) => onChange("filterMaxDistance", e.target.value)}
                placeholder="e.g., 500"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no distance preference
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="filterLanguages" className="text-sm font-medium">
                Required languages
              </label>
              <Input
                id="filterLanguages"
                value={form.filterLanguages}
                onChange={(e) => onChange("filterLanguages", e.target.value)}
                placeholder="e.g., en, de"
              />
              <p className="text-xs text-muted-foreground">
                Project owners must speak these languages
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="filterMinHours" className="text-sm font-medium">
                Min hours/week
              </label>
              <Input
                id="filterMinHours"
                type="number"
                min="0"
                value={form.filterMinHours}
                onChange={(e) => onChange("filterMinHours", e.target.value)}
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="filterMaxHours" className="text-sm font-medium">
                Max hours/week
              </label>
              <Input
                id="filterMaxHours"
                type="number"
                min="0"
                value={form.filterMaxHours}
                onChange={(e) => onChange("filterMaxHours", e.target.value)}
                placeholder="e.g., 20"
              />
            </div>
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
