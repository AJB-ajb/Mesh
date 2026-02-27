"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, CheckCircle } from "lucide-react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { labels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { deriveSkillNames } from "@/lib/skills/derive";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillGapPromptProps {
  postingId: string;
  postingSkills: string[];
  currentUserId: string;
  onProfileUpdated: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLocalStorageKey(postingId: string): string {
  return `skill-gap-dismissed-${postingId}`;
}

function isDismissedInStorage(postingId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getLocalStorageKey(postingId)) === "true";
}

/**
 * Renders a simple inline title where **bold** segments are wrapped in <strong>.
 */
function SkillGapTitle({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function findGapSkills(
  postingSkills: string[],
  userSkills: string[],
): string[] {
  const userSkillsLower = new Set(userSkills.map((s) => s.toLowerCase()));
  return postingSkills.filter((s) => !userSkillsLower.has(s.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Fetcher for user skills
// ---------------------------------------------------------------------------

async function fetchUserSkills(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data: profileSkillRows } = await supabase
    .from("profile_skills")
    .select("skill_id, skill_nodes(id, name)")
    .eq("profile_id", userId);

  if (!profileSkillRows) return [];
  return deriveSkillNames(profileSkillRows);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkillGapPrompt({
  postingId,
  postingSkills,
  currentUserId,
  onProfileUpdated,
}: SkillGapPromptProps) {
  const l = labels.skillGap;

  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    queueMicrotask(() => {
      setIsDismissed(isDismissedInStorage(postingId));
    });
  }, [postingId]);

  // Fetch user skills via SWR
  const { data: userSkills } = useSWR(
    currentUserId ? `user-skills/${currentUserId}` : null,
    () => fetchUserSkills(currentUserId),
  );

  const gapSkills = findGapSkills(postingSkills, userSkills ?? []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(getLocalStorageKey(postingId), "true");
    setIsDismissed(true);
  }, [postingId]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/extract/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateInstruction: text.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      setIsSuccess(true);
      setTimeout(() => {
        onProfileUpdated();
      }, 1500);
    } catch {
      // Silently handle — the user can retry
    } finally {
      setIsSubmitting(false);
    }
  }, [text, isSubmitting, onProfileUpdated]);

  // Don't render if no gap, dismissed, or still loading skills
  if (isDismissed) return null;
  if (postingSkills.length === 0) return null;
  if (!userSkills) return null; // Still loading
  if (gapSkills.length === 0) return null;

  const titleText = l.title(gapSkills);

  return (
    <Card>
      <CardHeader className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8"
          onClick={handleDismiss}
          aria-label={l.dismissAriaLabel}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle className="pr-8 text-base">
          <SkillGapTitle text={titleText} />
        </CardTitle>
        <CardDescription>{l.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isSuccess ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            {l.success}
          </div>
        ) : (
          <>
            <Textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={l.placeholder}
            />
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !text.trim()}
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {l.adding}
                </>
              ) : (
                l.addToProfile
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
