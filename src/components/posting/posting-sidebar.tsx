"use client";

import { Share2, Flag, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/format";
import type { PostingDetail } from "@/lib/hooks/use-posting-detail";

type PostingSidebarProps = {
  posting: PostingDetail;
  isOwner: boolean;
  onContactCreator: () => void;
};

export function PostingSidebar({
  posting,
  isOwner,
  onContactCreator,
}: PostingSidebarProps) {
  const creatorName = posting.profiles?.full_name || "Unknown";
  const creatorHeadline = posting.profiles?.headline || "";
  const creatorSkills = posting.profiles?.skills || [];

  return (
    <div className="space-y-6">
      {/* Creator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Posting Creator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {getInitials(creatorName)}
            </div>
            <div>
              <h4 className="font-medium">{creatorName}</h4>
              {creatorHeadline && (
                <p className="text-sm text-muted-foreground">
                  {creatorHeadline}
                </p>
              )}
            </div>
          </div>
          {creatorSkills.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Skills</p>
              <div className="flex flex-wrap gap-1">
                {creatorSkills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {!isOwner && (
            <Button className="w-full" onClick={onContactCreator}>
              <MessageSquare className="h-4 w-4" />
              Contact Creator
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Share2 className="h-4 w-4" />
            Share Posting
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Flag className="h-4 w-4" />
            Report Issue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
