"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProfileFormState } from "@/lib/types/profile";
import {
  parseList,
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
} from "@/lib/types/profile";

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

export function ProfileView({ form }: { form: ProfileFormState }) {
  const skillsList = parseList(form.skills);
  const interestsList = parseList(form.interests);

  const hasAvailability = Object.keys(form.availabilitySlots).length > 0;

  return (
    <div data-testid="profile-view" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Full name</p>
              <p className="font-medium">{form.fullName || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Headline</p>
              <p className="font-medium">{form.headline || "Not provided"}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">About</p>
            <p className="font-medium">{form.bio || "Not provided"}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">
                {form.location || "Not provided"}
                {form.locationLat && form.locationLng && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({form.locationLat}, {form.locationLng})
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Spoken languages</p>
              <p className="font-medium">{form.languages || "Not provided"}</p>
            </div>
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
              <div className="space-y-2">
                {form.selectedSkills.map((skill) => (
                  <div key={skill.skillId} className="flex items-center gap-3">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill levels */}
          {form.skillLevels.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Skill Levels</p>
              <div className="space-y-2">
                {form.skillLevels.map((skill, i) => (
                  <div key={i} className="flex items-center gap-3">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {skillsList.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Skills</p>
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {interestsList.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Interests</p>
              <div className="flex flex-wrap gap-2">
                {interestsList.map((interest) => (
                  <Badge key={interest} variant="outline">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Portfolio</p>
              {form.portfolioUrl ? (
                <a
                  href={form.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {form.portfolioUrl}
                </a>
              ) : (
                <p className="font-medium">Not provided</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">GitHub</p>
              {form.githubUrl ? (
                <a
                  href={form.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {form.githubUrl}
                </a>
              ) : (
                <p className="font-medium">Not provided</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability */}
      {hasAvailability && (
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
                                  ? "bg-primary/20 border border-primary"
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
      )}
    </div>
  );
}
