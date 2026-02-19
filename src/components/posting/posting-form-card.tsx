"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { SkillPicker } from "@/components/skill/skill-picker";
import type { GeocodingResult } from "@/lib/geocoding";
import type { SelectedPostingSkill } from "@/lib/types/skill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";

import {
  type PostingFormState,
  defaultPostingFormState,
} from "@/lib/types/posting";
export type { PostingFormState };
export { defaultPostingFormState as defaultFormState };

type PostingFormCardProps = {
  form: PostingFormState;
  setForm: React.Dispatch<React.SetStateAction<PostingFormState>>;
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

export function PostingFormCard({
  form,
  setForm,
  onChange,
  onSubmit,
  isSaving,
  isExtracting,
}: PostingFormCardProps) {
  // --- Selected skills handlers ---
  const handleAddSkill = (skill: SelectedPostingSkill) => {
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

  const handleUpdateSkillLevel = (skillId: string, levelMin: number | null) => {
    setForm((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.map((s) =>
        s.skillId === skillId ? { ...s, levelMin } : s,
      ),
    }));
  };

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{labels.postingForm.cardTitle}</CardTitle>
          <CardDescription>
            {labels.postingForm.cardDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              {labels.postingForm.titleLabel}
            </label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder={labels.postingForm.titlePlaceholder}
              className="text-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              {labels.postingForm.descriptionLabel}{" "}
              <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="description"
              rows={6}
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder={labels.postingForm.descriptionPlaceholder}
              enableMic
              onTranscriptionChange={(text) =>
                onChange(
                  "description",
                  form.description ? form.description + " " + text : text,
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              {labels.extraction.formHint}
            </p>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {labels.postingForm.skillsLabel}
            </label>
            <p className="text-xs text-muted-foreground">
              {labels.postingForm.skillsHelp}
            </p>
            <SkillPicker
              mode="posting"
              selectedSkills={form.selectedSkills}
              onAdd={handleAddSkill}
              onRemove={handleRemoveSkill}
              onUpdateLevel={handleUpdateSkillLevel}
              placeholder={labels.postingForm.skillsPlaceholder}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">
              {labels.postingForm.tagsLabel}
            </label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => onChange("tags", e.target.value)}
              placeholder={labels.postingForm.tagsPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              {labels.postingForm.tagsHelp}
            </p>
          </div>

          {/* Estimated Time and Category */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="estimated-time" className="text-sm font-medium">
                {labels.postingForm.estimatedTimeLabel}
              </label>
              <Input
                id="estimated-time"
                value={form.estimatedTime}
                onChange={(e) => onChange("estimatedTime", e.target.value)}
                placeholder={labels.postingForm.estimatedTimePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                {labels.postingForm.categoryLabel}
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => onChange("category", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="study">
                  {labels.postingForm.categoryOptions.study}
                </option>
                <option value="hackathon">
                  {labels.postingForm.categoryOptions.hackathon}
                </option>
                <option value="personal">
                  {labels.postingForm.categoryOptions.personal}
                </option>
                <option value="professional">
                  {labels.postingForm.categoryOptions.professional}
                </option>
                <option value="social">
                  {labels.postingForm.categoryOptions.social}
                </option>
              </select>
            </div>
          </div>

          {/* Context Identifier */}
          <div className="space-y-2">
            <label htmlFor="context-identifier" className="text-sm font-medium">
              {labels.postingForm.contextLabel}
            </label>
            <Input
              id="context-identifier"
              value={form.contextIdentifier}
              onChange={(e) => onChange("contextIdentifier", e.target.value)}
              placeholder={labels.postingForm.contextPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              {labels.postingForm.contextHelp}
            </p>
          </div>

          {/* Team size, Mode, and Expires */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label htmlFor="team-size-min" className="text-sm font-medium">
                {labels.postingForm.teamSizeMinLabel}
              </label>
              <Input
                id="team-size-min"
                type="number"
                min={1}
                max={10}
                value={form.teamSizeMin}
                onChange={(e) => onChange("teamSizeMin", e.target.value)}
                placeholder={labels.postingForm.teamSizeMinPlaceholder}
              />
              <p className="text-xs text-muted-foreground">
                {labels.postingForm.teamSizeMinHelp}
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="looking-for" className="text-sm font-medium">
                {labels.postingForm.lookingForLabel}
              </label>
              <Input
                id="looking-for"
                type="number"
                min={1}
                max={10}
                value={form.lookingFor}
                onChange={(e) => onChange("lookingFor", e.target.value)}
                placeholder={labels.postingForm.lookingForPlaceholder}
              />
              <p className="text-xs text-muted-foreground">
                {labels.postingForm.lookingForHelp}
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="mode" className="text-sm font-medium">
                {labels.postingForm.modeLabel}
              </label>
              <select
                id="mode"
                value={form.mode}
                onChange={(e) => onChange("mode", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="open">
                  {labels.postingForm.modeOptions.open}
                </option>
                <option value="friend_ask">
                  {labels.postingForm.modeOptions.friend_ask}
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="expires-at" className="text-sm font-medium">
                {labels.postingForm.expiresOnLabel}
              </label>
              <Input
                id="expires-at"
                type="date"
                value={form.expiresAt}
                onChange={(e) => onChange("expiresAt", e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
              <p className="text-xs text-muted-foreground">
                {labels.postingForm.expiresOnHelp}
              </p>
            </div>
          </div>

          {/* Location */}
          <LocationSection form={form} onChange={onChange} />

          {/* Auto-Accept */}
          <div className="flex items-center gap-3">
            <input
              id="auto-accept"
              type="checkbox"
              checked={form.autoAccept === "true"}
              onChange={(e) =>
                onChange("autoAccept", e.target.checked ? "true" : "false")
              }
              className="h-4 w-4 rounded border border-input"
            />
            <label htmlFor="auto-accept" className="text-sm font-medium">
              {labels.postingForm.autoAcceptLabel}
            </label>
            <p className="text-xs text-muted-foreground">
              {labels.postingForm.autoAcceptHelp}
            </p>
          </div>

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
                  {labels.postingForm.creatingButton}
                </>
              ) : (
                labels.postingForm.createButton
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/my-postings">{labels.postingForm.cancelButton}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
