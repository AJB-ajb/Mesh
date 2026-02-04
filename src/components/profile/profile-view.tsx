"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProfileFormState } from "@/lib/types/profile";
import { parseList } from "@/lib/types/profile";

export function ProfileView({ form }: { form: ProfileFormState }) {
  const skillsList = parseList(form.skills);
  const interestsList = parseList(form.interests);

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
              <p className="font-medium">
                {form.fullName || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Headline</p>
              <p className="font-medium">
                {form.headline || "Not provided"}
              </p>
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
              <p className="text-sm text-muted-foreground">Availability</p>
              <p className="font-medium">
                {form.availabilityHours
                  ? `${form.availabilityHours} hrs/week`
                  : "Not provided"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your actual weekly availability
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Remote preference
              </p>
              <p className="font-medium">{form.remotePreference}% remote</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Spoken languages
              </p>
              <p className="font-medium">
                {form.languages || "Not provided"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Experience level
              </p>
              <p className="font-medium capitalize">
                {form.experienceLevel}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Collaboration style
              </p>
              <p className="font-medium capitalize">
                {form.collaborationStyle === "async"
                  ? "Mostly async"
                  : form.collaborationStyle === "sync"
                    ? "Mostly sync"
                    : "Hybrid"}
              </p>
            </div>
          </div>

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
              <p className="mb-2 text-sm text-muted-foreground">
                Interests
              </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Project Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Project types</p>
              <p className="font-medium">
                {form.projectTypes || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Preferred roles
              </p>
              <p className="font-medium">
                {form.preferredRoles || "Not provided"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Preferred tech stack
            </p>
            <p className="font-medium">
              {form.preferredStack || "Not provided"}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Preferred project commitment
              </p>
              <p className="font-medium">{form.commitmentLevel} hrs/week</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your preferred project commitment level
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Timeline preference
              </p>
              <p className="font-medium">
                {form.timelinePreference === "weekend"
                  ? "This weekend"
                  : form.timelinePreference === "1_week"
                    ? "1 week"
                    : form.timelinePreference === "1_month"
                      ? "1 month"
                      : "Ongoing"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Max distance</p>
              <p className="font-medium">
                {form.filterMaxDistance
                  ? `${form.filterMaxDistance} km`
                  : "No limit"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Required languages
              </p>
              <p className="font-medium">
                {form.filterLanguages || "Any"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Hours range</p>
              <p className="font-medium">
                {form.filterMinHours || form.filterMaxHours
                  ? `${form.filterMinHours || "0"} - ${form.filterMaxHours || "\u221E"} hrs/week`
                  : "Any"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
