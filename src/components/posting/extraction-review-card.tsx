"use client";

import { Sparkles, Check, RefreshCw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { labels } from "@/lib/labels";
import type { useExtractionReview } from "@/lib/hooks/use-extraction-review";

type ExtractionReviewCardProps = Pick<
  ReturnType<typeof useExtractionReview>,
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

export function ExtractionReviewCard({
  status,
  extracted,
  acceptAll,
  acceptField,
  dismiss,
  retry,
}: ExtractionReviewCardProps) {
  if (status === "idle") return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {labels.extractionReview.title}
        </CardTitle>
        {status === "done" && (
          <p className="text-sm text-muted-foreground">
            {labels.extractionReview.subtitle}
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
              {labels.extractionReview.error}
            </p>
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {labels.extractionReview.retry}
            </Button>
          </div>
        )}

        {/* Results */}
        {status === "done" && extracted && (
          <div>
            <div className="divide-y">
              {extracted.category && (
                <FieldRow
                  label={labels.extractionReview.fieldLabels.category}
                  value={
                    <Badge variant="secondary" className="capitalize">
                      {extracted.category}
                    </Badge>
                  }
                  onAccept={() => acceptField("category")}
                />
              )}

              {extracted.skills && extracted.skills.length > 0 && (
                <FieldRow
                  label={labels.extractionReview.fieldLabels.skills}
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

              {(extracted.team_size_min || extracted.team_size_max) && (
                <FieldRow
                  label={labels.extractionReview.fieldLabels.teamSize}
                  value={
                    <span className="text-sm">
                      {extracted.team_size_min ?? "?"} –{" "}
                      {extracted.team_size_max ?? "?"}
                    </span>
                  }
                  onAccept={() => {
                    if (extracted.team_size_min) acceptField("team_size_min");
                    if (extracted.team_size_max) acceptField("team_size_max");
                  }}
                />
              )}

              {extracted.estimated_time && (
                <FieldRow
                  label={labels.extractionReview.fieldLabels.estimatedTime}
                  value={
                    <span className="text-sm">{extracted.estimated_time}</span>
                  }
                  onAccept={() => acceptField("estimated_time")}
                />
              )}

              {extracted.tags && extracted.tags.length > 0 && (
                <FieldRow
                  label={labels.extractionReview.fieldLabels.tags}
                  value={
                    <div className="flex flex-wrap gap-1">
                      {extracted.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  }
                  onAccept={() => acceptField("tags")}
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
                {labels.extractionReview.dismiss}
              </button>
              <Button size="sm" onClick={acceptAll}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {labels.extractionReview.acceptAll}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
