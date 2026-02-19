"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";
import type { ExtractedProfileV2 } from "@/lib/types/profile";
import type { ExtractedPosting } from "@/lib/types/posting";
import type { ProfileUpdateResponse } from "@/lib/types/profile";
import type { PostingUpdateResponse } from "@/lib/types/posting";

type EntityType = "profile" | "posting";
type Extracted = ExtractedProfileV2 | ExtractedPosting;

type FreeFormUpdateProps<T extends Extracted> = {
  entityType: EntityType;
  entityId?: string; // required for posting
  sourceText: string | null;
  canUndo: boolean;
  isApplying: boolean;
  onUpdate: (updatedText: string, extracted: T) => Promise<void>;
  onUndo: () => Promise<void>;
};

const API_ENDPOINTS: Record<EntityType, string> = {
  profile: "/api/extract/profile/update",
  posting: "/api/extract/posting/update",
};

export function FreeFormUpdate<T extends Extracted>({
  entityType,
  entityId,
  sourceText,
  canUndo,
  isApplying,
  onUpdate,
  onUndo,
}: FreeFormUpdateProps<T>) {
  const [editableSourceText, setEditableSourceText] = useState(
    sourceText ?? "",
  );
  const [updateInstruction, setUpdateInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSourceText, setShowSourceText] = useState(!!sourceText);

  const copy = labels.quickUpdate[entityType];

  const handleApplyUpdate = async () => {
    if (!updateInstruction.trim()) return;

    setError(null);

    try {
      const body: Record<string, string> = {
        sourceText: editableSourceText,
        updateInstruction,
      };
      if (entityType === "posting" && entityId) {
        body.postingId = entityId;
      }

      const res = await fetch(API_ENDPOINTS[entityType], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error?.message ?? data.error ?? "Failed to apply update.",
        );
        return;
      }

      if (entityType === "profile") {
        const data: ProfileUpdateResponse = await res.json();
        setEditableSourceText(data.updatedSourceText);
        setUpdateInstruction("");
        await onUpdate(data.updatedSourceText, data.extractedProfile as T);
      } else {
        const data: PostingUpdateResponse = await res.json();
        setEditableSourceText(data.updatedSourceText);
        setUpdateInstruction("");
        await onUpdate(data.updatedSourceText, data.extractedPosting as T);
      }
    } catch {
      setError(labels.quickUpdate.networkError);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          {canUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={isApplying}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              {labels.quickUpdate.undoButton}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Collapsible source text */}
        {(sourceText || editableSourceText) && (
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowSourceText(!showSourceText)}
            >
              {showSourceText ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {copy.sourceLabel}
            </button>
            {showSourceText && (
              <Textarea
                className="mt-2"
                rows={6}
                value={editableSourceText}
                onChange={(e) => setEditableSourceText(e.target.value)}
                placeholder={copy.sourcePlaceholder}
                enableMic
                onTranscriptionChange={(text) =>
                  setEditableSourceText((prev) =>
                    prev ? prev + " " + text : text,
                  )
                }
              />
            )}
          </div>
        )}

        {/* Update instruction */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{copy.instructionLabel}</label>
          <Textarea
            rows={2}
            value={updateInstruction}
            onChange={(e) => setUpdateInstruction(e.target.value)}
            placeholder={copy.instructionPlaceholder}
            enableMic
            onTranscriptionChange={(text) =>
              setUpdateInstruction((prev) => (prev ? prev + " " + text : text))
            }
          />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          onClick={handleApplyUpdate}
          disabled={isApplying || !updateInstruction.trim()}
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {labels.quickUpdate.applyingButton}
            </>
          ) : (
            labels.quickUpdate.applyButton
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
