"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { labels } from "@/lib/labels";
import { SkillPicker } from "@/components/skill/skill-picker";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import type { SelectedPostingSkill } from "@/lib/types/skill";
import type { GeocodingResult } from "@/lib/geocoding";
import { useTemplates } from "@/lib/hooks/use-templates";

// ---------------------------------------------------------------------------
// Shared overlay props
// ---------------------------------------------------------------------------

export interface OverlayResult {
  display: string;
  data?: Record<string, unknown>;
}

interface OverlayProps {
  onInsert: (result: string | OverlayResult) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Time Picker Overlay
// ---------------------------------------------------------------------------

const DAYS = [
  { key: "mon", label: labels.slashCommands.dayLabels.mon },
  { key: "tue", label: labels.slashCommands.dayLabels.tue },
  { key: "wed", label: labels.slashCommands.dayLabels.wed },
  { key: "thu", label: labels.slashCommands.dayLabels.thu },
  { key: "fri", label: labels.slashCommands.dayLabels.fri },
  { key: "sat", label: labels.slashCommands.dayLabels.sat },
  { key: "sun", label: labels.slashCommands.dayLabels.sun },
] as const;

const DAY_GROUPS = [
  { key: "weekdays", label: labels.slashCommands.dayLabels.weekdays },
  { key: "weekends", label: labels.slashCommands.dayLabels.weekends },
] as const;

const TIME_OF_DAY = [
  { key: "morning", label: labels.slashCommands.timeOfDay.morning },
  { key: "afternoon", label: labels.slashCommands.timeOfDay.afternoon },
  { key: "evening", label: labels.slashCommands.timeOfDay.evening },
] as const;

const WEEKDAY_KEYS = new Set(["mon", "tue", "wed", "thu", "fri"]);
const WEEKEND_KEYS = new Set(["sat", "sun"]);

export function TimePickerOverlay({ onInsert, onClose }: OverlayProps) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(new Set());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const toggleDay = (key: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleDayGroup = (groupKey: string) => {
    const keys = groupKey === "weekdays" ? WEEKDAY_KEYS : WEEKEND_KEYS;
    setSelectedDays((prev) => {
      const next = new Set(prev);
      const allSelected = [...keys].every((k) => next.has(k));
      if (allSelected) {
        keys.forEach((k) => next.delete(k));
      } else {
        keys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const toggleTime = (key: string) => {
    setSelectedTimes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const buildText = (): string => {
    const parts: string[] = [];

    // Day summary
    const allWeekdays = [...WEEKDAY_KEYS].every((k) => selectedDays.has(k));
    const allWeekends = [...WEEKEND_KEYS].every((k) => selectedDays.has(k));
    const noIndividualDays = selectedDays.size === 0;

    if (allWeekdays && allWeekends) {
      parts.push("every day");
    } else if (allWeekdays && !allWeekends) {
      parts.push("weekdays");
    } else if (allWeekends && !allWeekdays) {
      parts.push("weekends");
    } else if (!noIndividualDays) {
      const dayNames = DAYS.filter((d) => selectedDays.has(d.key)).map(
        (d) => d.label,
      );
      parts.push(dayNames.join(", "));
    }

    // Time summary
    if (customFrom && customTo) {
      parts.push(`${customFrom}\u2013${customTo}`);
    } else if (selectedTimes.size > 0) {
      const timeNames = TIME_OF_DAY.filter((t) => selectedTimes.has(t.key)).map(
        (t) => t.label.toLowerCase(),
      );
      parts.push(timeNames.join(", "));
    }

    return parts.join(" ") || "";
  };

  const canInsert = selectedDays.size > 0 || customFrom || customTo;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.slashCommands.timePickerTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Day chips */}
          <div className="flex flex-wrap gap-2">
            {DAY_GROUPS.map((group) => {
              const keys =
                group.key === "weekdays" ? WEEKDAY_KEYS : WEEKEND_KEYS;
              const allSelected = [...keys].every((k) => selectedDays.has(k));
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => toggleDayGroup(group.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    allSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selectedDays.has(day.key)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>

          {/* Time of day chips */}
          <div className="flex flex-wrap gap-2">
            {TIME_OF_DAY.map((time) => (
              <button
                key={time.key}
                type="button"
                onClick={() => toggleTime(time.key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selectedTimes.has(time.key)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent"
                }`}
              >
                {time.label}
              </button>
            ))}
          </div>

          {/* Custom time range */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {labels.slashCommands.customTimeLabel}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-auto"
              />
              <span className="text-muted-foreground">&ndash;</span>
              <Input
                type="time"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {labels.slashCommands.cancelButton}
          </Button>
          <Button
            type="button"
            disabled={!canInsert}
            onClick={() =>
              onInsert({
                display: buildText(),
                data: {
                  days: Array.from(selectedDays),
                  times: Array.from(selectedTimes),
                  customFrom: customFrom || undefined,
                  customTo: customTo || undefined,
                },
              })
            }
          >
            {labels.slashCommands.insertButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Location Overlay
// ---------------------------------------------------------------------------

export function LocationOverlay({ onInsert, onClose }: OverlayProps) {
  const [location, setLocation] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState<GeocodingResult | null>(null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.slashCommands.locationTitle}</DialogTitle>
        </DialogHeader>
        <LocationAutocomplete
          value={location}
          onChange={(value) => {
            setLocation(value);
            setSelectedLocation(null);
          }}
          onSelect={(result) => {
            setSelectedLocation(result);
            setLocation(result.displayName);
          }}
          placeholder={labels.slashCommands.locationPlaceholder}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {labels.slashCommands.cancelButton}
          </Button>
          <Button
            type="button"
            disabled={!location.trim()}
            onClick={() =>
              onInsert({
                display: selectedLocation?.displayName ?? location.trim(),
                data: {
                  displayName: selectedLocation?.displayName ?? location.trim(),
                  lat: selectedLocation?.lat,
                  lng: selectedLocation?.lng,
                },
              })
            }
          >
            {labels.slashCommands.insertButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Skills Picker Overlay
// ---------------------------------------------------------------------------

export function SkillPickerOverlay({ onInsert, onClose }: OverlayProps) {
  const [selectedSkills, setSelectedSkills] = useState<SelectedPostingSkill[]>(
    [],
  );

  const handleAdd = (skill: SelectedPostingSkill) => {
    setSelectedSkills((prev) => [...prev, skill]);
  };

  const handleRemove = (skillId: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s.skillId !== skillId));
  };

  const handleUpdateLevel = (skillId: string, levelMin: number | null) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.skillId === skillId ? { ...s, levelMin } : s)),
    );
  };

  const serializeSkills = (): string => {
    const parts = selectedSkills.map((s) =>
      s.levelMin != null
        ? labels.slashCommands.skillsMinLevel(s.name, s.levelMin)
        : labels.slashCommands.skillsAnyLevel(s.name),
    );
    return `${labels.slashCommands.skillsPrefix} ${parts.join(", ")}`;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{labels.slashCommands.skillsTitle}</DialogTitle>
        </DialogHeader>
        <SkillPicker
          mode="posting"
          selectedSkills={selectedSkills}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onUpdateLevel={handleUpdateLevel}
          placeholder={labels.slashCommands.skillsPlaceholder}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {labels.slashCommands.cancelButton}
          </Button>
          <Button
            type="button"
            disabled={selectedSkills.length === 0}
            onClick={() =>
              onInsert({
                display: serializeSkills(),
                data: {
                  skills: selectedSkills.map((s) => ({
                    skillId: s.skillId,
                    name: s.name,
                    levelMin: s.levelMin,
                  })),
                },
              })
            }
          >
            {labels.slashCommands.insertButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Template Overlay
// ---------------------------------------------------------------------------

interface TemplateOption {
  key: string;
  title: string;
  content: string;
}

const FALLBACK_TEMPLATES: TemplateOption[] = [
  {
    key: "studyGroup",
    title: labels.slashCommands.templates.studyGroup,
    content: [
      "Looking for study partners!",
      "",
      "Subject: [your subject here]",
      "Goal: Prepare for exams / learn together",
      "Schedule: [preferred times]",
      "Level: All welcome",
    ].join("\n"),
  },
  {
    key: "hackathonTeam",
    title: labels.slashCommands.templates.hackathonTeam,
    content: [
      "Building a hackathon team!",
      "",
      "Hackathon: [name and date]",
      "Project idea: [brief description]",
      "Looking for: [roles/skills needed]",
      "Experience level: Any",
    ].join("\n"),
  },
  {
    key: "sideProject",
    title: labels.slashCommands.templates.sideProject,
    content: [
      "Side project looking for collaborators!",
      "",
      "Project: [name or brief description]",
      "Tech stack: [technologies used]",
      "Time commitment: [hours per week]",
      "Current status: [just starting / in progress]",
    ].join("\n"),
  },
  {
    key: "mentorship",
    title: labels.slashCommands.templates.mentorship,
    content: [
      "Looking for a mentor/mentee!",
      "",
      "Topic: [area of expertise]",
      "I can offer: [what you bring]",
      "Looking for: [what you need]",
      "Frequency: [how often to meet]",
    ].join("\n"),
  },
  {
    key: "social",
    title: labels.slashCommands.templates.social,
    content: [
      "Let's hang out!",
      "",
      "Activity: [what you want to do]",
      "When: [preferred times]",
      "Where: [location or online]",
      "Group size: [how many people]",
    ].join("\n"),
  },
];

export function TemplateOverlay({ onInsert, onClose }: OverlayProps) {
  const { templates, isLoading, error } = useTemplates();

  // Use DB templates when available, fall back to hardcoded on error
  const displayTemplates =
    error || templates.length === 0
      ? FALLBACK_TEMPLATES
      : templates.map((t) => ({
          key: t.id,
          title: t.title,
          content: t.content,
        }));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.slashCommands.templateTitle}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {displayTemplates.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => onInsert(template.content)}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                <div className="font-medium text-sm">{template.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {template.content.split("\n")[0]}
                </div>
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {labels.slashCommands.cancelButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
