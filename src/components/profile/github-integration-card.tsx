"use client";

import {
  Github,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GitHubSyncStatus } from "@/lib/types/profile";
import { labels } from "@/lib/labels";

export function GitHubIntegrationCard({
  isGithubProvider,
  githubSync,
  isGithubSyncing,
  githubSyncError,
  onSync,
  onApplySuggestion,
}: {
  isGithubProvider: boolean;
  githubSync: GitHubSyncStatus | null;
  isGithubSyncing: boolean;
  githubSyncError: string | null;
  onSync: () => void;
  onApplySuggestion: (
    field: "skills" | "interests" | "bio",
    values: string | string[],
  ) => void;
}) {
  return (
    <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle className="text-lg">{labels.github.cardTitle}</CardTitle>
          </div>
          {isGithubProvider && (
            <Button
              onClick={onSync}
              disabled={isGithubSyncing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isGithubSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {labels.github.syncingButton}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {labels.github.syncButton}
                </>
              )}
            </Button>
          )}
        </div>
        <CardDescription>{labels.github.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isGithubProvider && (
          <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {labels.github.connectInfo}
            </p>
          </div>
        )}

        {isGithubProvider && (
          <>
            {githubSyncError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {githubSyncError}
              </div>
            )}

            {githubSync?.synced && githubSync.data && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  {labels.github.lastSynced(
                    new Date(githubSync.lastSyncedAt!).toLocaleDateString(),
                    new Date(githubSync.lastSyncedAt!).toLocaleTimeString(),
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {labels.github.usernameLabel}
                    </p>
                    <a
                      href={githubSync.data.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      @{githubSync.data.githubUsername}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {labels.github.activityLabel}
                    </p>
                    <p className="font-medium">
                      {githubSync.data.repoCount} repos &middot;{" "}
                      {githubSync.data.totalStars} stars &middot;{" "}
                      <span className="capitalize">
                        {githubSync.data.activityLevel}
                      </span>{" "}
                      activity
                    </p>
                  </div>
                </div>

                {githubSync.data.primaryLanguages.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {labels.github.languagesLabel}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {githubSync.data.primaryLanguages
                        .slice(0, 8)
                        .map((lang) => (
                          <Badge
                            key={lang}
                            variant="secondary"
                            className="bg-purple-100 dark:bg-purple-900/30"
                          >
                            {lang}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {githubSync.data.codingStyle && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {labels.github.codingStyleLabel}
                    </p>
                    <p className="font-medium text-sm">
                      {githubSync.data.codingStyle}
                    </p>
                  </div>
                )}

                {githubSync.data.experienceSignals.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {labels.github.experienceSignalsLabel}
                    </p>
                    <ul className="text-sm space-y-1">
                      {githubSync.data.experienceSignals
                        .slice(0, 3)
                        .map((signal, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Sparkles className="h-3 w-3 mt-1 text-purple-500" />
                            {signal}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {githubSync.suggestions &&
                  ((githubSync.suggestions.suggestedSkills?.length ?? 0) > 0 ||
                    (githubSync.suggestions.suggestedInterests?.length ?? 0) >
                      0 ||
                    githubSync.suggestions.suggestedBio) && (
                    <div className="rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 p-4 space-y-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        {labels.github.suggestionsTitle}
                      </p>

                      {(githubSync.suggestions.suggestedSkills?.length ?? 0) >
                        0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground">
                              {labels.github.suggestedSkillsLabel}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() =>
                                onApplySuggestion(
                                  "skills",
                                  githubSync.suggestions!.suggestedSkills || [],
                                )
                              }
                            >
                              {labels.github.addAllButton}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(githubSync.suggestions.suggestedSkills || [])
                              .slice(0, 6)
                              .map((skill) => (
                                <Badge
                                  key={skill}
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                  onClick={() =>
                                    onApplySuggestion("skills", [skill])
                                  }
                                >
                                  + {skill}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      {(githubSync.suggestions.suggestedInterests?.length ??
                        0) > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground">
                              {labels.github.suggestedInterestsLabel}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() =>
                                onApplySuggestion(
                                  "interests",
                                  githubSync.suggestions!.suggestedInterests ||
                                    [],
                                )
                              }
                            >
                              {labels.github.addAllButton}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(githubSync.suggestions.suggestedInterests || [])
                              .slice(0, 5)
                              .map((interest) => (
                                <Badge
                                  key={interest}
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                  onClick={() =>
                                    onApplySuggestion("interests", [interest])
                                  }
                                >
                                  + {interest}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      {githubSync.suggestions.suggestedBio && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground">
                              {labels.github.suggestedBioLabel}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() =>
                                onApplySuggestion(
                                  "bio",
                                  githubSync.suggestions!.suggestedBio!,
                                )
                              }
                            >
                              {labels.github.useThisButton}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            &quot;{githubSync.suggestions.suggestedBio}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            )}

            {!githubSync?.synced && !isGithubSyncing && (
              <p className="text-sm text-muted-foreground">
                {labels.github.syncHelp}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
