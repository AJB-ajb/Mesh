"use client";

import { Sparkles, Check, RefreshCw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { labels } from "@/lib/labels";
import type { useProfileExtractionReview } from "@/lib/hooks/use-profile-extraction-review";

type ProfileExtractionReviewCardProps = Pick<
  ReturnType<typeof useProfileExtractionReview>,
  "status" | "extracted" | "acceptAll" | "acceptField" | "dismiss" | "retry"
>;

function FieldRow({
  label,
  value,
  onAccept,
}: {
  label: string;
  value: React.ReactNode;
  onAccept: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5">{value}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAccept}
        className="shrink-0 h-8 w-8 p-0"
        title={labels.extractionReview.accept}
      >
        <Check className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ProfileExtractionReviewCard({
  status,
  extracted,
  acceptAll,
  acceptField,
  dismiss,
  retry,
}: ProfileExtractionReviewCardProps) {
  if (status === "idle") return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {labels.profileTextFirst.extractionReviewTitle}
        </CardTitle>
        {status === "done" && (
          <p className="text-sm text-muted-foreground">
            {labels.profileTextFirst.extractionReviewDescription}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Loading state */}
        {status === "extracting" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {labels.extractionReview.extracting}
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive">
              {labels.profileTextFirst.errorExtraction}
            </p>
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {labels.profileTextFirst.retry}
            </Button>
          </div>
        )}

        {/* Results */}
        {status === "done" && extracted && (
          <div>
            <div className="divide-y">
              {extracted.full_name && (
                <FieldRow
                  label={labels.extractionReviewFields.fullName}
                  value={<span className="text-sm">{extracted.full_name}</span>}
                  onAccept={() => acceptField("full_name")}
                />
              )}

              {extracted.headline && (
                <FieldRow
                  label={labels.extractionReviewFields.headline}
                  value={<span className="text-sm">{extracted.headline}</span>}
                  onAccept={() => acceptField("headline")}
                />
              )}

              {extracted.skills && extracted.skills.length > 0 && (
                <FieldRow
                  label={labels.extractionReviewFields.skills}
                  value={
                    <div className="flex flex-wrap gap-1">
                      {extracted.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-xs"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  }
                  onAccept={() => acceptField("skills")}
                />
              )}

              {extracted.interests && extracted.interests.length > 0 && (
                <FieldRow
                  label="Interests"
                  value={
                    <div className="flex flex-wrap gap-1">
                      {extracted.interests.map((interest) => (
                        <Badge
                          key={interest}
                          variant="outline"
                          className="text-xs"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  }
                  onAccept={() => acceptField("interests")}
                />
              )}

              {extracted.location && (
                <FieldRow
                  label={labels.extractionReviewFields.location}
                  value={<span className="text-sm">{extracted.location}</span>}
                  onAccept={() => acceptField("location")}
                />
              )}

              {extracted.languages && extracted.languages.length > 0 && (
                <FieldRow
                  label={labels.extractionReviewFields.languages}
                  value={
                    <div className="flex flex-wrap gap-1">
                      {extracted.languages.map((lang) => (
                        <Badge key={lang} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  }
                  onAccept={() => acceptField("languages")}
                />
              )}

              {extracted.bio && (
                <FieldRow
                  label={labels.extractionReviewFields.bio}
                  value={
                    <p className="text-sm line-clamp-2">{extracted.bio}</p>
                  }
                  onAccept={() => acceptField("bio")}
                />
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <button
                type="button"
                onClick={dismiss}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {labels.profileTextFirst.dismiss}
              </button>
              <Button size="sm" onClick={acceptAll}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {labels.profileTextFirst.acceptAll}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
