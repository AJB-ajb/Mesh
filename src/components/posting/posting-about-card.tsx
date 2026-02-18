"use client";

import { useState } from "react";
import { Users, Calendar, Clock, MapPin, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { NOT_SPECIFIED } from "@/lib/format";
import type { GeocodingResult } from "@/lib/geocoding";
import type {
  PostingDetail,
  PostingFormState,
} from "@/lib/hooks/use-posting-detail";

type PostingAboutCardProps = {
  posting: PostingDetail;
  isEditing: boolean;
  form: PostingFormState;
  onFormChange: (field: keyof PostingFormState, value: string) => void;
};

function getLocationModeDisplay(mode: string | null) {
  switch (mode) {
    case "remote":
      return { icon: "🏠", label: "Remote" };
    case "in_person":
      return { icon: "📍", label: "In-person" };
    case "either":
    default:
      return { icon: "🌐", label: "Flexible" };
  }
}

function LocationEditFields({
  form,
  onFormChange,
}: {
  form: PostingFormState;
  onFormChange: (field: keyof PostingFormState, value: string) => void;
}) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const showLocation =
    form.locationMode === "in_person" || form.locationMode === "either";
  const showMaxDistance = form.locationMode === "in_person";

  const handleLocationSelect = (result: GeocodingResult) => {
    onFormChange("locationName", result.displayName);
    onFormChange("locationLat", result.lat.toString());
    onFormChange("locationLng", result.lng.toString());
    setShowAutocomplete(false);
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Location Mode</label>
        <select
          value={form.locationMode}
          onChange={(e) => onFormChange("locationMode", e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="either">Flexible</option>
          <option value="remote">Remote</option>
          <option value="in_person">In-person</option>
        </select>
      </div>
      {showLocation && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          {showAutocomplete ? (
            <LocationAutocomplete
              value={form.locationName}
              onSelect={handleLocationSelect}
              onChange={(value) => onFormChange("locationName", value)}
              placeholder="Search for a location..."
            />
          ) : (
            <Input
              value={form.locationName}
              onChange={(e) => onFormChange("locationName", e.target.value)}
              placeholder="e.g., Berlin, Germany"
            />
          )}
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
      )}
      {showMaxDistance && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Max Distance (km)</label>
          <Input
            type="number"
            min={1}
            value={form.maxDistanceKm}
            onChange={(e) => onFormChange("maxDistanceKm", e.target.value)}
            placeholder="e.g., 50"
          />
        </div>
      )}
    </>
  );
}

export function PostingAboutCard({
  posting,
  isEditing,
  form,
  onFormChange,
}: PostingAboutCardProps) {
  const locationDisplay = getLocationModeDisplay(posting.location_mode);

  return (
    <Card>
      <CardHeader>
        <CardTitle>About this posting</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <textarea
            value={form.description}
            onChange={(e) => onFormChange("description", e.target.value)}
            rows={6}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        ) : (
          <p className="text-muted-foreground whitespace-pre-wrap">
            {posting.description}
          </p>
        )}

        {/* Skills */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Skills</h4>
          {isEditing ? (
            <Input
              value={form.skills}
              onChange={(e) => onFormChange("skills", e.target.value)}
              placeholder="React, TypeScript, Node.js (comma-separated)"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {posting.skills?.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
              {(!posting.skills || posting.skills.length === 0) && (
                <span className="text-sm text-muted-foreground">
                  No specific skills listed
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        {!isEditing && posting.tags && posting.tags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {posting.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Context Identifier */}
        {!isEditing && posting.context_identifier && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Context</h4>
            <Badge variant="secondary">{posting.context_identifier}</Badge>
          </div>
        )}

        {/* Skill Level Minimum */}
        {!isEditing && posting.skill_level_min != null && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Minimum Skill Level</h4>
            <span className="text-sm">{posting.skill_level_min}/10</span>
          </div>
        )}

        {/* Meta */}
        {isEditing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Time</label>
              <Input
                value={form.estimatedTime}
                onChange={(e) => onFormChange("estimatedTime", e.target.value)}
                placeholder="e.g., 2 weeks, 1 month"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={form.category}
                onChange={(e) => onFormChange("category", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="study">Study</option>
                <option value="hackathon">Hackathon</option>
                <option value="personal">Personal</option>
                <option value="professional">Professional</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Looking for</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.lookingFor}
                onChange={(e) => onFormChange("lookingFor", e.target.value)}
                placeholder="Number of people (1-10)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => onFormChange("mode", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="friend_ask">Sequential Invite</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expires on</label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => onFormChange("expiresAt", e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => onFormChange("status", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="filled">Filled</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tags (comma-separated)
              </label>
              <Input
                value={form.tags}
                onChange={(e) => onFormChange("tags", e.target.value)}
                placeholder="e.g., beginner-friendly, remote"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Context</label>
              <Input
                value={form.contextIdentifier}
                onChange={(e) =>
                  onFormChange("contextIdentifier", e.target.value)
                }
                placeholder="e.g., CS101, HackMIT 2026"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Min Skill Level (0-10)
              </label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.skillLevelMin}
                onChange={(e) => onFormChange("skillLevelMin", e.target.value)}
                placeholder="e.g., 3"
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input
                id="auto-accept"
                type="checkbox"
                checked={form.autoAccept === "true"}
                onChange={(e) =>
                  onFormChange(
                    "autoAccept",
                    e.target.checked ? "true" : "false",
                  )
                }
                className="h-4 w-4 rounded border border-input"
              />
              <label htmlFor="auto-accept" className="text-sm font-medium">
                Auto-accept
              </label>
              <span className="text-xs text-muted-foreground">
                Instantly accept anyone who joins (no manual review)
              </span>
            </div>
            <LocationEditFields form={form} onFormChange={onFormChange} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Looking for</p>
              <p className="font-medium">
                {posting.team_size_max}{" "}
                {posting.team_size_max === 1 ? "person" : "people"}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Estimated Time
              </p>
              <p className="font-medium">
                {posting.estimated_time || NOT_SPECIFIED}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Category</p>
              <p className="font-medium capitalize">
                {posting.category || NOT_SPECIFIED}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Location</p>
              <p className="font-medium">
                {locationDisplay.icon}{" "}
                {posting.location_name || locationDisplay.label}
              </p>
              {posting.max_distance_km && (
                <p className="text-xs text-muted-foreground mt-1">
                  Within {posting.max_distance_km} km
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
