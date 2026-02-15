"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import type { GeocodingResult } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  type PostingFormState,
  defaultPostingFormState,
} from "@/lib/types/posting";
export type { PostingFormState };
export { defaultPostingFormState as defaultFormState };

type PostingFormCardProps = {
  form: PostingFormState;
  onChange: (field: keyof PostingFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  isExtracting: boolean;
};

function LocationSection({
  form,
  onChange,
}: {
  form: PostingFormState;
  onChange: (field: keyof PostingFormState, value: string) => void;
}) {
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
          Location Mode
        </label>
        <select
          id="location-mode"
          value={form.locationMode}
          onChange={(e) => onChange("locationMode", e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="either">Flexible</option>
          <option value="remote">Remote</option>
          <option value="in_person">In-person</option>
        </select>
      </div>

      {showLocation && (
        <div className="space-y-2">
          <label htmlFor="location-name" className="text-sm font-medium">
            Location
          </label>
          {showAutocomplete ? (
            <LocationAutocomplete
              value={form.locationName}
              onSelect={handleLocationSelect}
              onChange={(value) => onChange("locationName", value)}
              placeholder="Search for a location..."
            />
          ) : (
            <Input
              id="location-name"
              value={form.locationName}
              onChange={(e) => onChange("locationName", e.target.value)}
              placeholder="e.g., Berlin, Germany"
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
                  Manual entry
                </>
              ) : (
                <>
                  <Search className="mr-1 h-3 w-3" />
                  Search location
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {showMaxDistance && (
        <div className="space-y-2">
          <label htmlFor="max-distance" className="text-sm font-medium">
            Max Distance (km)
          </label>
          <Input
            id="max-distance"
            type="number"
            min={1}
            value={form.maxDistanceKm}
            onChange={(e) => onChange("maxDistanceKm", e.target.value)}
            placeholder="e.g., 50"
          />
          <p className="text-xs text-muted-foreground">
            Maximum distance for in-person collaboration. Used as a hard filter
            in matching.
          </p>
        </div>
      )}
    </div>
  );
}

export function PostingFormCard({
  form,
  onChange,
  onSubmit,
  isSaving,
  isExtracting,
}: PostingFormCardProps) {
  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Posting Details</CardTitle>
          <CardDescription>
            Tell us about your posting in plain language. You can paste from
            Slack, Discord, or describe it yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Posting Title
            </label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="Optional — auto-generated from description"
              className="text-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="description"
              rows={6}
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Describe your project and what kind of collaborators you're looking for...

Example: Building a Minecraft-style collaborative IDE, need 2-3 people with WebGL or game dev experience, hackathon this weekend."
              enableMic
              onTranscriptionChange={(text) =>
                onChange(
                  "description",
                  form.description ? form.description + " " + text : text,
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Our AI will extract skills, team size, and timeline from your
              description.
            </p>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <label htmlFor="skills" className="text-sm font-medium">
              Skills (comma-separated)
            </label>
            <Input
              id="skills"
              value={form.skills}
              onChange={(e) => onChange("skills", e.target.value)}
              placeholder="e.g., React, TypeScript, Node.js, AI/ML"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">
              Tags (comma-separated)
            </label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => onChange("tags", e.target.value)}
              placeholder="e.g., beginner-friendly, weekend, remote, sustainability"
            />
            <p className="text-xs text-muted-foreground">
              Free-form tags to help people discover your posting.
            </p>
          </div>

          {/* Estimated Time and Category */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="estimated-time" className="text-sm font-medium">
                Estimated Time
              </label>
              <Input
                id="estimated-time"
                value={form.estimatedTime}
                onChange={(e) => onChange("estimatedTime", e.target.value)}
                placeholder="e.g., 2 weeks, 1 month"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => onChange("category", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="study">Study</option>
                <option value="hackathon">Hackathon</option>
                <option value="personal">Personal</option>
                <option value="professional">Professional</option>
                <option value="social">Social</option>
              </select>
            </div>
          </div>

          {/* Context Identifier */}
          <div className="space-y-2">
            <label htmlFor="context-identifier" className="text-sm font-medium">
              Context (optional)
            </label>
            <Input
              id="context-identifier"
              value={form.contextIdentifier}
              onChange={(e) => onChange("contextIdentifier", e.target.value)}
              placeholder="e.g., CS101, HackMIT 2026, Book Club #3"
            />
            <p className="text-xs text-muted-foreground">
              Course code, hackathon name, or group identifier for exact-match
              filtering.
            </p>
          </div>

          {/* Looking for, Mode, and Expires */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="looking-for" className="text-sm font-medium">
                Looking for
              </label>
              <Input
                id="looking-for"
                type="number"
                min={1}
                max={10}
                value={form.lookingFor}
                onChange={(e) => onChange("lookingFor", e.target.value)}
                placeholder="e.g., 3"
              />
              <p className="text-xs text-muted-foreground">
                Number of people (1-10)
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="mode" className="text-sm font-medium">
                Mode
              </label>
              <select
                id="mode"
                value={form.mode}
                onChange={(e) => onChange("mode", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="open">Open</option>
                <option value="friend_ask">Sequential Invite</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="expires-at" className="text-sm font-medium">
                Expires on
              </label>
              <Input
                id="expires-at"
                type="date"
                value={form.expiresAt}
                onChange={(e) => onChange("expiresAt", e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
              <p className="text-xs text-muted-foreground">
                Default: 90 days from today
              </p>
            </div>
          </div>

          {/* Skill Level Minimum */}
          <div className="space-y-2">
            <label htmlFor="skill-level-min" className="text-sm font-medium">
              Minimum Skill Level (0-10)
            </label>
            <Input
              id="skill-level-min"
              type="number"
              min={0}
              max={10}
              value={form.skillLevelMin}
              onChange={(e) => onChange("skillLevelMin", e.target.value)}
              placeholder="e.g., 3"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for no minimum. 0 = absolute beginner, 10 = expert.
            </p>
          </div>

          {/* Location */}
          <LocationSection form={form} onChange={onChange} />

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSaving || isExtracting}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Posting"
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/postings">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
