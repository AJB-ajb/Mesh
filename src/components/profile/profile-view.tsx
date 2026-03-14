"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stack } from "@/components/ui/stack";
import { Group } from "@/components/ui/group";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import type { ProfileFormState } from "@/lib/types/profile";
import {
  parseList,
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
} from "@/lib/types/profile";
import type { RecurringWindow } from "@/lib/types/availability";
import { CalendarWeekView } from "@/components/availability/calendar-week-view";

const LOCATION_MODE_DISPLAY: Record<string, string> = {
  remote: "Remote",
  in_person: "In-person",
  either: "Flexible",
};

function skillLevelLabel(level: number): string {
  if (level <= 2) return "Beginner";
  if (level <= 4) return "Can follow tutorials";
  if (level <= 6) return "Intermediate";
  if (level <= 8) return "Advanced";
  return "Expert";
}

export function ProfileView({
  form,
  availabilityWindows,
  busyBlocks,
}: {
  form: ProfileFormState;
  availabilityWindows?: RecurringWindow[];
  busyBlocks?: RecurringWindow[];
}) {
  const skillsList = parseList(form.skills);
  const interestsList = parseList(form.interests);

  const hasAvailability = Object.keys(form.availabilitySlots).length > 0;

  return (
    <Stack data-testid="profile-view" gap="lg">
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack gap="md">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Full name</p>
                <p className="font-medium">{form.fullName || "Not provided"}</p>
              </div>
              {form.headline && (
                <div>
                  <p className="text-sm text-muted-foreground">Headline</p>
                  <p className="font-medium">{form.headline}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">About</p>
              {form.bio ? (
                <MarkdownRenderer content={form.bio} className="font-medium" />
              ) : (
                <p className="font-medium">Not provided</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{form.location || "Not provided"}</p>
              </div>
              {form.languages && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Spoken languages
                  </p>
                  <p className="font-medium">{form.languages}</p>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Location mode</p>
                <p className="font-medium">
                  {LOCATION_MODE_DISPLAY[form.locationMode] ?? "Flexible"}
                </p>
              </div>
            </div>

            {/* Tree-based skills */}
            {form.selectedSkills.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Skills</p>
                <Stack gap="sm">
                  {form.selectedSkills.map((skill) => (
                    <Group key={skill.skillId} gap="sm">
                      <span className="w-32 truncate text-sm font-medium">
                        {skill.name}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(skill.level / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-24 text-right">
                        {skill.level}/10 ({skillLevelLabel(skill.level)})
                      </span>
                    </Group>
                  ))}
                </Stack>
              </div>
            )}

            {/* Skill levels */}
            {form.skillLevels.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Skill Levels
                </p>
                <Stack gap="sm">
                  {form.skillLevels.map((skill, i) => (
                    <Group key={i} gap="sm">
                      <span className="w-32 truncate text-sm font-medium">
                        {skill.name || "Unnamed"}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(skill.level / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-24 text-right">
                        {skill.level}/10 ({skillLevelLabel(skill.level)})
                      </span>
                    </Group>
                  ))}
                </Stack>
              </div>
            )}

            {skillsList.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Skills</p>
                <Group wrap gap="md">
                  {skillsList.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}

            {interestsList.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Interests</p>
                <Group wrap gap="md">
                  {interestsList.map((interest) => (
                    <Badge key={interest} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}
            {(form.portfolioUrl || form.githubUrl) && (
              <div className="grid gap-4 md:grid-cols-2">
                {form.portfolioUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio</p>
                    <a
                      href={form.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {form.portfolioUrl}
                    </a>
                  </div>
                )}
                {form.githubUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground">GitHub</p>
                    <a
                      href={form.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {form.githubUrl}
                    </a>
                  </div>
                )}
              </div>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Availability — prefer CalendarWeekView if windows are available */}
      {availabilityWindows && availabilityWindows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarWeekView
              windows={availabilityWindows}
              onChange={() => {}}
              readOnly
              busyBlocks={busyBlocks}
            />
          </CardContent>
        </Card>
      ) : hasAvailability ? (
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
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
                            <div
                              className={`h-6 w-full rounded-md ${
                                active
                                  ? "bg-destructive/15 border border-destructive/50"
                                  : "bg-muted border border-transparent"
                              }`}
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
      ) : null}
    </Stack>
  );
}
