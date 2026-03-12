"use client";

import { Users, Clock, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CardData } from "./mock-data";

type PostingCardInlineProps = {
  card: CardData;
};

export function PostingCardInline({ card }: PostingCardInlineProps) {
  return (
    <Card className="mx-2 overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* Creator + time */}
        {card.postingCreator && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {card.postingCreator}
            </span>
            {card.postingCreatorTime && (
              <>
                <span>·</span>
                <span>{card.postingCreatorTime}</span>
              </>
            )}
          </div>
        )}

        {/* Title */}
        {card.postingTitle && (
          <h4 className="text-sm font-semibold line-clamp-2">
            {card.postingTitle}
          </h4>
        )}

        {/* Description */}
        {card.postingText && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {card.postingText}
          </p>
        )}

        {/* Meta line */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {card.postingTags?.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              <Tag className="size-2.5 mr-0.5" />
              {tag}
            </Badge>
          ))}
          {card.postingCapacity && (
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {card.postingCapacity}
            </span>
          )}
          {card.postingDeadline && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {card.postingDeadline}
            </span>
          )}
        </div>

        {/* CTA */}
        <Button size="sm" className="w-full min-h-[44px]">
          Join
        </Button>
      </CardContent>
    </Card>
  );
}
