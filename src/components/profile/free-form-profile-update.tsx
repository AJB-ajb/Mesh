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
import type {
  ExtractedProfileV2,
  ProfileUpdateResponse,
} from "@/lib/types/profile";

export function FreeFormProfileUpdate({
  sourceText,
  canUndo,
  isApplying,
  onUpdate,
  onUndo,
}: {
  sourceText: string | null;
  canUndo: boolean;
  isApplying: boolean;
  onUpdate: (
    updatedText: string,
    extractedProfile: ExtractedProfileV2,
  ) => Promise<void>;
  onUndo: () => Promise<void>;
}) {
  const [editableSourceText, setEditableSourceText] = useState(
    sourceText ?? "",
  );
  const [updateInstruction, setUpdateInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSourceText, setShowSourceText] = useState(!!sourceText);

  const handleApplyUpdate = async () => {
    if (!editableSourceText.trim() || !updateInstruction.trim()) return;

    setError(null);

    try {
      const res = await fetch("/api/extract/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: editableSourceText,
          updateInstruction,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to apply update.");
        return;
      }

      const data: ProfileUpdateResponse = await res.json();

      setEditableSourceText(data.updatedSourceText);
      setUpdateInstruction("");
      await onUpdate(data.updatedSourceText, data.extractedProfile);
    } catch {
      setError("Network error. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Quick Update</CardTitle>
            <CardDescription>
              Describe what changed and your profile fields will update
              automatically.
            </CardDescription>
          </div>
          {canUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={isApplying}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Undo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Collapsible source text */}
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
            Profile description
          </button>
          {showSourceText && (
            <Textarea
              className="mt-2"
              rows={6}
              value={editableSourceText}
              onChange={(e) => setEditableSourceText(e.target.value)}
              placeholder="Paste or type your profile description here (e.g., a short bio, your skills, what you're looking for)..."
            />
          )}
        </div>

        {/* Update instruction */}
        <div className="space-y-2">
          <label className="text-sm font-medium">What changed?</label>
          <Textarea
            rows={2}
            value={updateInstruction}
            onChange={(e) => setUpdateInstruction(e.target.value)}
            placeholder="e.g., I also know Python now and am available 20 hours/week"
          />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          onClick={handleApplyUpdate}
          disabled={
            isApplying ||
            !editableSourceText.trim() ||
            !updateInstruction.trim()
          }
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying...
            </>
          ) : (
            "Apply Update"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
