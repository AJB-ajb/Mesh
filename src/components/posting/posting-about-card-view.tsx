"use client";

import { Users, Calendar, Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { NOT_SPECIFIED } from "@/lib/format";
import { getLocationModeDisplay } from "@/lib/posting/location";
import type { PostingDetail } from "@/lib/hooks/use-posting-detail";
import type { QuestionMode } from "@/lib/hidden-syntax";

// ---------------------------------------------------------------------------
// PostingAboutCardView — display-only rendering of the about card
// ---------------------------------------------------------------------------

type PostingAboutCardViewProps = {
  posting: PostingDetail;
  revealHidden?: boolean;
  questionMode?: QuestionMode;
};

export function PostingAboutCardView({
  posting,
  revealHidden,
  questionMode,
}: PostingAboutCardViewProps) {
  const locationDisplay = getLocationModeDisplay(posting.location_mode);

  return (
    <>
      <MarkdownRenderer
        content={posting.description ?? ""}
        className="text-muted-foreground"
        revealHidden={revealHidden}
        questionMode={questionMode}
      />

      {/* Skills */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Skills</h4>
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
      </div>

      {/* Tags */}
      {posting.tags && posting.tags.length > 0 && (
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
      {posting.context_identifier && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Context</h4>
          <Badge variant="secondary">{posting.context_identifier}</Badge>
        </div>
      )}

      {/* Meta */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Team size</p>
          <p className="font-medium">
            {posting.team_size_min}&ndash;{posting.team_size_max} total · Looking for{" "}
            {Math.max(1, posting.team_size_max - 1)}
          </p>
        </div>
        {posting.estimated_time && (
          <div className="rounded-lg border border-border p-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Estimated Time</p>
            <p className="font-medium">{posting.estimated_time}</p>
          </div>
        )}
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
    </>
  );
}
